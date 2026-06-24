# -*- coding: utf-8 -*-
"""
crawl_google_maps_reviews_to_txt.py

Crawler review Google Maps cho ReviewHub.
- Dùng chung cho nhà xe, khách sạn, tàu hỏa, máy bay, tour.
- Hỗ trợ rating Google Maps dạng:
  + "5 sao", "4 sao"
  + "5 stars"
  + "5/5", "4/5" cho một số khách sạn
- Output: scripts/google_maps_reviews.txt
- Mỗi dòng là 1 JSON review để import bằng import_reviews_from_txt.js

Bản này sửa lỗi:
- Không tự tạo TEMP-001.
- Match được "khach san Vinpearl Resort Nha Trang" với KS-002.
- Không xóa chữ "resort" khỏi keyword nữa.
- Có token match: keyword "vinpearl nha trang" vẫn match được "Vinpearl Resort Nha Trang".
"""

import sys
import io
import os
import re
import json
import time
import random
from datetime import datetime, timezone
from urllib.parse import urlparse, quote_plus

try:
    import requests
    from PIL import Image
except Exception:
    requests = None
    Image = None

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
try:
    from selenium.webdriver.common.actions.wheel_input import ScrollOrigin
except Exception:
    ScrollOrigin = None
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass


SEARCH_KEYWORD = sys.argv[1] if len(sys.argv) > 1 else "Phương Trang"

try:
    MAX_REVIEWS = int(sys.argv[2]) if len(sys.argv) > 2 else 100
except Exception:
    MAX_REVIEWS = 100

try:
    MAX_IMAGES = int(sys.argv[3]) if len(sys.argv) > 3 else MAX_REVIEWS
except Exception:
    MAX_IMAGES = MAX_REVIEWS

# Tham số thứ 4 do run.bat truyền vào:
# PT / KS / MB / TH / TO / DV
# Dùng để giới hạn tìm đúng nhóm dịch vụ, tránh trùng tên giữa các nhóm.
SELECTED_PREFIX = sys.argv[4].upper().strip() if len(sys.argv) > 4 else ""

# Set SAVE_REVIEW_IMAGES=0 nếu chỉ muốn crawl text, không tải ảnh.
SAVE_REVIEW_IMAGES = os.getenv("SAVE_REVIEW_IMAGES", "1").strip() != "0"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Nếu file nằm trong scripts/ thì ROOT_DIR là thư mục project.
# Nếu file đặt ở root project thì vẫn tự nhận đúng nơi có frontend/.
ROOT_DIR = BASE_DIR
for candidate in [BASE_DIR, os.path.dirname(BASE_DIR)]:
    if os.path.isdir(os.path.join(candidate, "frontend")):
        ROOT_DIR = candidate
        break

OUTPUT_FILE = os.path.join(BASE_DIR, "google_maps_reviews.txt")

SEED_OPERATORS_FILE = os.path.join(BASE_DIR, "seed-operators.js")
if not os.path.exists(SEED_OPERATORS_FILE):
    alt_seed = os.path.join(ROOT_DIR, "seed-operators.js")
    if os.path.exists(alt_seed):
        SEED_OPERATORS_FILE = alt_seed

PUBLIC_REVIEW_IMAGE_ROOT = os.path.join(
    ROOT_DIR, "frontend", "public", "anhdanggia"
)

SOURCE_SYSTEM = "google-maps"

CATEGORY_SLUG_BY_PREFIX = {
    "PT": "nhaxe",
    "KS": "khachsan",
    "MB": "maybay",
    "TH": "tauhoa",
    "TO": "tour",
    "DV": "dichvukhac",
}

SERVICE_SEARCH_PREFIX_BY_PREFIX = {
    "PT": "Nhà xe",
    "KS": "Khách sạn",
    "MB": "Hãng bay",
    "TH": "Tàu hỏa",
    "TO": "Tour",
    "DV": "",
}

# Bản NATIVE_NO_JS: không dùng driver.execute_script để scroll/click vì Google Maps dễ đứng/chặn load.
# Tăng tốc bằng native wheel + PageDown và giảm thời gian chờ.
SCROLL_WAIT_MIN = 1.0
SCROLL_WAIT_MAX = 1.8
MAX_SCROLL_ROUNDS = 60


def clean_text(text):
    if not text:
        return ""

    return re.sub(r"\s+", " ", str(text)).strip()


def normalize_text(value):
    text = str(value or "").lower().strip()
    text = text.replace("đ", "d")
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_compact(value):
    return re.sub(r"[^a-z0-9]+", "", normalize_text(value))


def tokenize(value):
    return [
        token
        for token in re.split(r"[^a-z0-9]+", normalize_text(value))
        if token
    ]


def token_score(a, b):
    """Điểm giống nhau đơn giản để tránh click nhầm địa điểm/review cá nhân."""
    ta = [t for t in tokenize(a) if t not in {"khach", "san", "hotel", "nha", "xe", "resort", "luxury"}]
    tb = set(t for t in tokenize(b) if t not in {"khach", "san", "hotel", "nha", "xe", "resort", "luxury"})

    if not ta or not tb:
        return 0

    matched = sum(1 for t in ta if t in tb)
    return matched / max(len(ta), 1)


def is_review_or_share_url(driver):
    url = (driver.current_url or "").lower()
    bad_parts = ["/contrib/", "maps/contrib", "reviews", "maps.app.goo.gl"]
    return any(part in url for part in bad_parts) and "/maps/place" not in url


def close_unwanted_popups(driver):
    """Đóng popup chia sẻ/menu review nếu Google Maps tự mở nhầm."""
    try:
        body = driver.find_element(By.TAG_NAME, "body")
        for _ in range(2):
            body.send_keys(Keys.ESCAPE)
            time.sleep(0.25)
    except Exception:
        pass


def is_google_maps_url(url):
    """Chỉ cho phép ở lại Google Maps, tránh lạc qua Tripadvisor/Agoda/Booking..."""
    try:
        url = str(url or "").strip().lower()
        if not url:
            return False

        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path.lower()

        if "google." not in host:
            return False

        return path.startswith("/maps") or "/maps/" in path
    except Exception:
        return False


def get_element_href(element):
    """Lấy href của chính element hoặc thẻ a cha gần nhất."""
    try:
        href = element.get_attribute("href") or ""
        if href:
            return href
    except Exception:
        pass

    try:
        a = element.find_element(By.XPATH, "./ancestor-or-self::a[@href][1]")
        return a.get_attribute("href") or ""
    except Exception:
        return ""


def is_external_link_element(element):
    href = get_element_href(element)
    if not href:
        return False

    href_low = href.lower().strip()

    # Link không phải http như javascript:, mailto: thì bỏ qua không coi là maps link.
    if href_low.startswith("http") and not is_google_maps_url(href_low):
        return True

    return False


def recover_if_left_google_maps(driver, reason=""):
    """Nếu lỡ mở tab ngoài Google Maps thì đóng/quay lại ngay."""
    try:
        handles = list(driver.window_handles)
    except Exception:
        handles = []

    kept_handle = None

    # Đóng các tab ngoài Google Maps.
    for handle in handles:
        try:
            driver.switch_to.window(handle)
            current = driver.current_url or ""

            if is_google_maps_url(current):
                if kept_handle is None:
                    kept_handle = handle
                continue

            # Nếu là tab rỗng/newtab thì giữ lại tạm thời nếu chưa có maps tab.
            if current.startswith("chrome://newtab") or current == "data:,":
                if kept_handle is None:
                    kept_handle = handle
                continue

            print(f"⚠ Đã lạc khỏi Google Maps ({reason}): {current[:120]}")
            if len(handles) > 1:
                driver.close()
        except Exception:
            pass

    try:
        if kept_handle:
            driver.switch_to.window(kept_handle)
    except Exception:
        pass

    try:
        current = driver.current_url or ""
        if current and not is_google_maps_url(current):
            print("↩ Đang quay lại Google Maps, không cho crawl qua web khác.")
            try:
                driver.back()
                time.sleep(2)
            except Exception:
                pass

            if not is_google_maps_url(driver.current_url or ""):
                # Phương án cuối: mở lại Google Maps bằng keyword, tránh đứng ở Tripadvisor.
                driver.get("https://www.google.com/maps/search/" + quote_plus(GOOGLE_MAPS_SEARCH_TEXT))
                time.sleep(5)
    except Exception:
        pass


def safe_native_click(driver, element, note=""):
    """Click kiểu người dùng thật nhưng chặn mọi link ngoài Google Maps."""
    try:
        if is_external_link_element(element):
            href = get_element_href(element)
            print(f"⛔ Bỏ qua link ngoài Google Maps: {href[:140]}")
            return False
    except Exception:
        pass

    ok = native_click(driver, element, note)
    time.sleep(0.25)
    recover_if_left_google_maps(driver, note)
    return ok


def now_iso():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def moderation_status(rating=None, comment=None):
    return "pending_review"


def rating_to_number(text):
    if not text:
        return 0

    text = str(text).strip()

    # Khách sạn: 5/5, 4/5...
    match = re.search(r"([1-5])\s*/\s*5", text)

    if match:
        return int(match.group(1))

    # Tiếng Việt: 5 sao, 4 sao...
    match = re.search(r"([1-5])\s*sao", text, re.IGNORECASE)

    if match:
        return int(match.group(1))

    # Tiếng Anh: 5 stars, 4 stars...
    match = re.search(r"([1-5])\s*star", text, re.IGNORECASE)

    if match:
        return int(match.group(1))

    # Fallback
    match = re.search(r"([1-5])(?:[,.]0)?", text)

    if match:
        return int(match.group(1))

    return 0


def extract_review_count_from_label(label):
    if not label:
        return 0

    label = str(label).replace(".", "").replace(",", "")

    match = re.search(r"(\d+)\s*bài đánh giá", label, re.IGNORECASE)

    if match:
        return int(match.group(1))

    match = re.search(r"(\d+)\s*reviews?", label, re.IGNORECASE)

    if match:
        return int(match.group(1))

    return 0


def load_operators_from_seed():
    if not os.path.exists(SEED_OPERATORS_FILE):
        raise Exception(f"Không tìm thấy file {SEED_OPERATORS_FILE}")

    with open(SEED_OPERATORS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"\{\s*code:\s*['\"]([^'\"]+)['\"]\s*,\s*name:\s*['\"]([^'\"]+)['\"]"

    matches = re.findall(pattern, content)

    operators = []

    for code, name in matches:
        operators.append({
            "operatorCode": code.strip(),
            "operatorName": name.strip()
        })

    if not operators:
        raise Exception("Không đọc được operator nào trong seed-operators.js")

    return operators


def remove_service_words(keyword):
    text = normalize_text(keyword)

    # Cố tình KHÔNG xóa "resort", vì tên seed có "Vinpearl Resort Nha Trang".
    remove_words = [
        "nha xe",
        "nhà xe",
        "xe khach",
        "xe khách",
        "ben xe",
        "bến xe",
        "khach san",
        "khách sạn",
        "hotel",
        "khu nghi duong",
        "khu nghỉ dưỡng",
        "hang bay",
        "hãng bay",
        "may bay",
        "máy bay",
        "tau hoa",
        "tàu hỏa",
        "tour",
    ]

    for word in remove_words:
        text = text.replace(normalize_text(word), "")

    return clean_text(text)


def find_operator(search_keyword):
    operators = load_operators_from_seed()

    if SELECTED_PREFIX:
        operators = [
            op for op in operators
            if str(op.get("operatorCode", "")).upper().startswith(f"{SELECTED_PREFIX}-")
        ]

        if not operators:
            raise Exception(
                f"Không có operator nào thuộc nhóm {SELECTED_PREFIX} trong seed-operators.js"
            )

    raw_keyword = str(search_keyword or "").strip()
    keyword = normalize_text(raw_keyword)
    clean_keyword = remove_service_words(raw_keyword)

    print("DEBUG FIND OPERATOR")
    print(f"Seed file     : {SEED_OPERATORS_FILE}")
    print(f"Raw keyword   : {raw_keyword}")
    print(f"Selected group: {SELECTED_PREFIX or 'ALL'}")
    print(f"Clean keyword : {clean_keyword}")

    # 1. Match đúng tên
    for op in operators:
        op_name = normalize_text(op["operatorName"])

        if op_name == clean_keyword:
            print(f"✓ Match exact: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 2. Match keyword nằm trong tên
    for op in operators:
        op_name = normalize_text(op["operatorName"])

        if clean_keyword and clean_keyword in op_name:
            print(f"✓ Match keyword in operator: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 3. Match tên nằm trong keyword
    for op in operators:
        op_name = normalize_text(op["operatorName"])

        if op_name and op_name in clean_keyword:
            print(f"✓ Match operator in keyword: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 4. Match theo code
    for op in operators:
        op_code = normalize_text(op["operatorCode"])

        if op_code == clean_keyword or op_code == keyword:
            print(f"✓ Match code: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 5. Compact match
    compact_keyword = normalize_compact(clean_keyword)

    for op in operators:
        compact_name = normalize_compact(op["operatorName"])

        if compact_keyword and (compact_keyword in compact_name or compact_name in compact_keyword):
            print(f"✓ Match compact: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 6. Token match: mọi token quan trọng của keyword có trong tên seed.
    # Ví dụ: "vinpearl nha trang" match "vinpearl resort nha trang".
    keyword_tokens = tokenize(clean_keyword)
    stop_tokens = {"hotel", "khach", "san", "nha", "xe", "the", "and"}
    keyword_tokens = [token for token in keyword_tokens if token not in stop_tokens]

    best = None
    best_score = 0

    for op in operators:
        name_tokens = set(tokenize(op["operatorName"]))

        if not keyword_tokens:
            continue

        matched = [token for token in keyword_tokens if token in name_tokens]
        score = len(matched) / max(len(keyword_tokens), 1)

        if score > best_score:
            best = op
            best_score = score

    if best and best_score >= 0.67:
        print(f"✓ Match token {best_score:.2f}: {best['operatorCode']} - {best['operatorName']}")
        return best

    print("")
    print("KHÔNG TÌM THẤY TRONG seed-operators.js")
    print("Kiểm tra xem file script đang đọc có đúng file bạn vừa sửa không.")
    print(f"Seed file đang đọc: {SEED_OPERATORS_FILE}")
    print("Một số tên đang có trong seed:")
    for op in operators[:80]:
        print(f"- {op['operatorCode']} - {op['operatorName']}")
    print("")

    raise Exception(
        f"Không tìm thấy '{search_keyword}' trong seed-operators.js"
        f"{' thuộc nhóm ' + SELECTED_PREFIX if SELECTED_PREFIX else ''}. "
        f"Hãy nhập đúng mã hoặc tên trong seed, ví dụ: PT-040 hoặc Vinpearl Resort Nha Trang. "
        f"Không import bằng TEMP-001 để tránh review không hiện trên frontend."
    )


selected_operator = find_operator(SEARCH_KEYWORD)

OPERATOR_CODE = selected_operator["operatorCode"]

TARGET_NAME = selected_operator["operatorName"]

OWNER_PARTNER_CODE = OPERATOR_CODE


def build_category_and_target_code(operator_code):
    if operator_code.startswith("KS-"):
        return "Khách sạn", f"HOTEL-{operator_code.replace('KS-', '')}-001"

    if operator_code.startswith("PT-"):
        return "Nhà xe", f"BUS-{operator_code.replace('PT-', '')}-001"

    if operator_code.startswith("TH-"):
        return "Tàu hỏa", f"TRAIN-{operator_code.replace('TH-', '')}-001"

    if operator_code.startswith("MB-"):
        return "Máy bay", f"AIR-{operator_code.replace('MB-', '')}-001"

    if operator_code.startswith("TO-"):
        return "Tour", f"TOUR-{operator_code.replace('TO-', '')}-001"

    if operator_code.startswith("DV-"):
        return "Dịch vụ khác", f"SERVICE-{operator_code.replace('DV-', '')}-001"

    return "Dịch vụ khác", f"SERVICE-{operator_code}-001"


def category_slug_from_code(operator_code):
    prefix = str(operator_code or "").split("-")[0].upper()
    return CATEGORY_SLUG_BY_PREFIX.get(prefix, "dichvukhac")


def make_google_maps_search_text(operator):
    operator_code = operator["operatorCode"]
    operator_name = operator["operatorName"]
    prefix = str(operator_code or "").split("-")[0].upper()
    service_prefix = SERVICE_SEARCH_PREFIX_BY_PREFIX.get(prefix, "")

    # Nếu người dùng nhập URL Google Maps thì vẫn mở theo keyword cũ ở search_place fallback.
    # Còn bình thường sẽ search kèm loại dịch vụ để tránh chọn nhầm.
    if service_prefix:
        return f"{service_prefix} {operator_name}"

    return operator_name


CATEGORY_NAME, TARGET_CODE = build_category_and_target_code(OPERATOR_CODE)
CATEGORY_SLUG = category_slug_from_code(OPERATOR_CODE)
GOOGLE_MAPS_SEARCH_TEXT = make_google_maps_search_text(selected_operator)
OUTPUT_IMAGE_DIR = os.path.join(PUBLIC_REVIEW_IMAGE_ROOT, CATEGORY_SLUG, OPERATOR_CODE)


print("====================================")
print("DỊCH VỤ ĐANG CRAWL")
print(f"Input keyword  : {SEARCH_KEYWORD}")
print(f"Maps search    : {GOOGLE_MAPS_SEARCH_TEXT}")
print(f"Category       : {CATEGORY_NAME}")
print(f"Category slug  : {CATEGORY_SLUG}")
print(f"Operator code  : {OPERATOR_CODE}")
print(f"Target code    : {TARGET_CODE}")
print(f"Target name    : {TARGET_NAME}")
print(f"Image folder   : {OUTPUT_IMAGE_DIR}")
print(f"MAX REVIEWS    : {MAX_REVIEWS}")
print(f"MAX IMAGES     : {MAX_IMAGES}")
print("Moderation     : pending_review")
print("Visibility     : hidden")
print("====================================")



def native_click(driver, element, note=""):
    """Click kiểu trình duyệt thật, không dùng JavaScript."""
    last_error = None

    try:
        element.click()
        return True
    except Exception as error:
        last_error = error

    try:
        ActionChains(driver).move_to_element(element).pause(0.12).click(element).perform()
        return True
    except Exception as error:
        last_error = error

    try:
        element.send_keys(Keys.ENTER)
        return True
    except Exception as error:
        last_error = error

    if note:
        print(f"Không click được {note}: {last_error}")

    return False


def focus_review_area(driver):
    """
    Tìm đúng panel danh sách review của Google Maps.
    Bản cũ đôi khi chỉ thấy 10 review đầu vì wheel/PageDown rơi vào body, không rơi vào panel review.
    Bản này ưu tiên panel chứa data-review-id rồi tìm ancestor có thể scroll.
    """
    try:
        panel = driver.execute_script(
            """
            const reviewBlocks = Array.from(document.querySelectorAll('div[data-review-id], div.jftiEf'));

            for (const block of reviewBlocks) {
                let el = block.parentElement;
                while (el && el !== document.body) {
                    const style = window.getComputedStyle(el);
                    const cls = String(el.className || '');
                    const role = el.getAttribute('role') || '';
                    const aria = el.getAttribute('aria-label') || '';
                    const canScroll = el.scrollHeight > el.clientHeight + 120;
                    const looksLikeReviewPanel =
                        role === 'feed' ||
                        cls.includes('m6QErb') ||
                        aria.toLowerCase().includes('review') ||
                        aria.toLowerCase().includes('bài đánh giá');

                    if (canScroll && looksLikeReviewPanel) return el;
                    if (canScroll && /(auto|scroll)/.test(style.overflowY)) return el;
                    el = el.parentElement;
                }
            }

            const candidates = Array.from(document.querySelectorAll(
                'div[role="feed"], div.m6QErb, div[aria-label*="Bài đánh giá"], div[aria-label*="Reviews"], div[role="main"] div'
            ));

            return candidates
                .filter(el => el && el.offsetParent !== null && el.scrollHeight > el.clientHeight + 120)
                .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || null;
            """
        )
        if panel:
            return panel
    except Exception:
        pass

    selectors = [
        "div[role='feed']",
        "div[aria-label*='Bài đánh giá']",
        "div[aria-label*='Reviews']",
        "div.m6QErb",
    ]

    for css in selectors:
        try:
            elements = driver.find_elements(By.CSS_SELECTOR, css)
            visible = []
            for el in elements:
                try:
                    if el.is_displayed() and el.size.get("height", 0) > 180:
                        visible.append(el)
                except Exception:
                    pass

            if visible:
                return sorted(
                    visible,
                    key=lambda e: e.size.get("height", 0) * e.size.get("width", 0),
                    reverse=True
                )[0]
        except Exception:
            pass

    try:
        return driver.find_element(By.TAG_NAME, "body")
    except Exception:
        return None


def js_scroll_review_panel(driver, amount=2400):
    """Fallback mạnh: scroll trực tiếp panel review và bắn wheel/scroll event để Google Maps load thêm."""
    try:
        result = driver.execute_script(
            """
            const amount = arguments[0] || 2400;

            function findPanel() {
                const reviewBlocks = Array.from(document.querySelectorAll('div[data-review-id], div.jftiEf'));
                for (const block of reviewBlocks) {
                    let el = block.parentElement;
                    while (el && el !== document.body) {
                        const style = window.getComputedStyle(el);
                        const cls = String(el.className || '');
                        const role = el.getAttribute('role') || '';
                        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                        const canScroll = el.scrollHeight > el.clientHeight + 120;
                        const looksLikeReviewPanel =
                            role === 'feed' ||
                            cls.includes('m6QErb') ||
                            aria.includes('review') ||
                            aria.includes('bài đánh giá');

                        if (canScroll && looksLikeReviewPanel) return el;
                        if (canScroll && /(auto|scroll)/.test(style.overflowY)) return el;
                        el = el.parentElement;
                    }
                }

                const candidates = Array.from(document.querySelectorAll(
                    'div[role="feed"], div.m6QErb, div[aria-label*="Bài đánh giá"], div[aria-label*="Reviews"], div[role="main"] div'
                ));

                return candidates
                    .filter(el => el && el.offsetParent !== null && el.scrollHeight > el.clientHeight + 120)
                    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || null;
            }

            const panel = findPanel();
            if (!panel) return {ok:false, reason:'no-panel'};

            const before = panel.scrollTop;
            panel.focus && panel.focus();
            panel.scrollTop = Math.min(panel.scrollHeight, panel.scrollTop + amount);
            panel.dispatchEvent(new WheelEvent('wheel', {bubbles:true, cancelable:true, deltaY:amount}));
            panel.dispatchEvent(new Event('scroll', {bubbles:true}));

            return {
                ok: true,
                before,
                after: panel.scrollTop,
                scrollHeight: panel.scrollHeight,
                clientHeight: panel.clientHeight
            };
            """,
            amount,
        )
        return result or {"ok": False}
    except Exception as error:
        return {"ok": False, "reason": str(error)}


def review_dom_signature(driver):
    """Lấy dấu hiệu review đầu/cuối để biết scroll có đổi nội dung không."""
    try:
        return driver.execute_script(
            """
            const blocks = Array.from(document.querySelectorAll('div[data-review-id], div.jftiEf')).slice(0, 20);
            return blocks.map((el) => {
                const id = el.getAttribute('data-review-id') || '';
                const txt = (el.innerText || '').replace(/\s+/g, ' ').slice(0, 90);
                return id + '|' + txt;
            }).join(' || ');
            """
        ) or ""
    except Exception:
        return ""


def native_scroll_down(driver, amount=2600, times=2):
    """
    Scroll nhiều lớp:
    - move chuột vào đúng panel review
    - WheelInput native
    - PageDown/End
    - JS fallback nếu native không làm Google Maps đổi danh sách
    """
    panel = focus_review_area(driver)

    for _ in range(times):
        before_sig = review_dom_signature(driver)

        if panel is not None:
            try:
                ActionChains(driver).move_to_element(panel).pause(0.08).perform()
            except Exception:
                pass

        if panel is not None and ScrollOrigin is not None:
            try:
                origin = ScrollOrigin.from_element(panel)
                ActionChains(driver).scroll_from_origin(origin, 0, amount).perform()
            except Exception:
                pass

        for key in (Keys.PAGE_DOWN, Keys.PAGE_DOWN, Keys.END):
            try:
                if panel is not None:
                    panel.send_keys(key)
                else:
                    driver.find_element(By.TAG_NAME, "body").send_keys(key)
                time.sleep(0.12)
            except Exception:
                try:
                    driver.find_element(By.TAG_NAME, "body").send_keys(key)
                    time.sleep(0.12)
                except Exception:
                    pass

        time.sleep(0.25)
        after_sig = review_dom_signature(driver)

        if before_sig == after_sig:
            js_result = js_scroll_review_panel(driver, amount=amount)
            if js_result.get("ok"):
                print(
                    f"DEBUG SCROLL JS: {js_result.get('before')} -> {js_result.get('after')} / {js_result.get('scrollHeight')}",
                    flush=True,
                )

        time.sleep(0.35)

    return True


def setup_driver():
    options = webdriver.ChromeOptions()

    # Không headless, không chặn ảnh. Google Maps dễ không hiện review nếu chạy ẩn/chặn ảnh.
    options.add_argument("--start-maximized")
    options.add_argument("--lang=vi-VN")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")

    # Profile riêng giúp giữ cookie Google Maps/consent, lần sau ít bị hỏi lại hơn.
    profile_dir = os.path.join(BASE_DIR, "chrome_profile_gmaps_native")
    os.makedirs(profile_dir, exist_ok=True)
    options.add_argument(f"--user-data-dir={profile_dir}")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )

    driver.set_page_load_timeout(90)
    return driver


def search_place(driver):
    driver.get("https://www.google.com/maps")

    wait = WebDriverWait(driver, 30)

    search_input = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@role='combobox']")
        )
    )

    search_input.clear()
    search_input.send_keys(GOOGLE_MAPS_SEARCH_TEXT)

    time.sleep(1)

    search_input.send_keys(Keys.ENTER)

    time.sleep(7)

    print("Đang chọn đúng địa điểm theo tên trong seed-operators.js...")

    result_cards = driver.find_elements(
        By.XPATH,
        "//div[@role='article' and contains(@class,'Nv2PK')]"
    )

    print(f"DEBUG: Tìm thấy {len(result_cards)} card result")

    if not result_cards:
        print("Không thấy danh sách card. Có thể Google Maps đã mở thẳng địa điểm.")
        time.sleep(4)
        return

    best_card = None
    best_review_count = -1
    best_name = ""
    best_score = -1

    for card in result_cards:
        try:
            name = card.find_element(
                By.XPATH,
                ".//div[contains(@class,'qBF1Pd')]"
            ).text
        except Exception:
            name = ""

        aria_label = ""

        rating_xpaths = [
            ".//span[@role='img' and contains(@aria-label,'bài đánh giá')]",
            ".//span[@role='img' and contains(@aria-label,'reviews')]",
            ".//span[contains(@aria-label,'bài đánh giá')]",
            ".//span[contains(@aria-label,'reviews')]",
            ".//*[contains(text(),'bài đánh giá')]",
            ".//*[contains(text(),'reviews')]",
        ]

        for xpath in rating_xpaths:
            try:
                rating_el = card.find_element(By.XPATH, xpath)
                aria_label = (
                    rating_el.get_attribute("aria-label")
                    or rating_el.get_attribute("title")
                    or rating_el.text
                    or ""
                )

                if aria_label:
                    break
            except Exception:
                pass

        review_count = extract_review_count_from_label(aria_label)
        score = token_score(TARGET_NAME, name)

        print(f"- {name}: {review_count} reviews | match={score:.2f}")

        if score > best_score or (score == best_score and review_count > best_review_count):
            best_score = score
            best_review_count = review_count
            best_card = card
            best_name = name

    if not best_card:
        print("Không tìm thấy kết quả phù hợp")
        return

    if best_score < 0.45:
        print("⚠ Không có card nào khớp đủ với tên seed. Không click bừa để tránh nhảy sai trang.")
        print(f"Tên seed: {TARGET_NAME}")
        print(f"Card tốt nhất Google trả: {best_name} | match={best_score:.2f}")
        print("Google Maps có thể đã mở thẳng địa điểm. Tiếp tục thử mở tab Bài đánh giá...")
        return

    print("\n====================================")
    print("ĐÃ CHỌN")
    print(best_name)
    print(f"{best_review_count} reviews")
    print(f"Match score: {best_score:.2f}")
    print("====================================\n")

    clicked = False

    # CHỈ click link Google Maps. Không dùng fallback .//a[@href] vì có thể là Tripadvisor/Agoda/Booking.
    link_xpaths = [
        ".//a[contains(@class,'hfpxzc') and (contains(@href,'/maps/place') or contains(@href,'google.com/maps'))]",
        ".//a[contains(@href,'/maps/place')]",
        ".//a[contains(@href,'google.com/maps')]",
    ]

    for xpath in link_xpaths:
        try:
            link = best_card.find_element(By.XPATH, xpath)
            if safe_native_click(driver, link, "link địa điểm"):
                clicked = True
                print("Đã click vào link địa điểm.")
                break
        except Exception:
            pass

    if not clicked:
        if safe_native_click(driver, best_card, "card kết quả"):
            clicked = True
            print("Không thấy link, đã click trực tiếp vào card.")

    if not clicked:
        raise Exception(
            "Không thể mở địa điểm Google Maps. Có thể giao diện Google Maps đã đổi hoặc kết quả không có link."
        )

    time.sleep(7)
    close_unwanted_popups(driver)


def click_review_tab(driver):
    wait = WebDriverWait(driver, 18)

    # Chỉ click đúng TAB review của địa điểm. Không dùng JavaScript click.
    review_xpaths = [
        "//button[@role='tab' and contains(@aria-label,'Bài đánh giá')]",
        "//button[@role='tab' and contains(normalize-space(.),'Bài đánh giá')]",
        "//button[@role='tab' and contains(@aria-label,'Reviews')]",
        "//button[@role='tab' and contains(normalize-space(.),'Reviews')]",
        "//button[contains(@aria-label,'Bài đánh giá')]",
        "//button[contains(@aria-label,'Reviews')]",
    ]

    last_error = None

    for xpath in review_xpaths:
        try:
            review_tab = wait.until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )

            if safe_native_click(driver, review_tab, "tab Bài đánh giá"):
                time.sleep(4)
                close_unwanted_popups(driver)
                print("Đã mở tab Bài đánh giá.")
                return
        except Exception as error:
            last_error = error

    # Giao diện khách sạn đôi khi không có tab Đánh giá ở thanh Tổng quan/Giá/Giới thiệu.
    print("⚠ Không tự mở được tab Bài đánh giá.")
    print("Nếu Chrome đang đứng ở trang khách sạn, hãy tự kéo/click tới phần Đánh giá rồi quay lại terminal nhấn Enter.")
    input("Nhấn Enter sau khi bạn đã thấy danh sách review trên Chrome...")
    close_unwanted_popups(driver)


def expand_more_buttons(driver):
    """Chỉ bấm nút mở rộng nằm BÊN TRONG review card, không bấm nút Thêm ở header/trang ngoài."""
    block_xpaths = [
        "//div[contains(@class,'jftiEf')]",
        "//div[@data-review-id]",
    ]

    safe_button_xpaths = [
        ".//button[normalize-space(.)='Thêm']",
        ".//button[normalize-space(.)='More']",
        ".//button[contains(@aria-label,'Xem thêm')]",
        ".//button[contains(@aria-label,'Đọc thêm')]",
        ".//button[contains(@aria-label,'See more')]",
    ]

    banned_words = [
        "chia sẻ", "share", "tùy chọn", "options", "menu", "ảnh", "photo",
        "hồ sơ", "profile", "người dùng", "user", "tripadvisor", "booking", "agoda"
    ]

    blocks = []
    for bx in block_xpaths:
        try:
            found = driver.find_elements(By.XPATH, bx)
            if found:
                blocks = found
                break
        except Exception:
            pass

    clicked = 0

    for block in blocks[:120]:
        for xpath in safe_button_xpaths:
            try:
                buttons = block.find_elements(By.XPATH, xpath)
            except Exception:
                buttons = []

            for btn in buttons[:3]:
                try:
                    if not btn.is_displayed():
                        continue

                    label = clean_text(
                        btn.get_attribute("aria-label")
                        or btn.get_attribute("title")
                        or btn.text
                        or ""
                    ).lower()

                    if any(word in label for word in banned_words):
                        continue

                    if safe_native_click(driver, btn, "nút mở rộng review"):
                        clicked += 1
                        time.sleep(0.025)
                except Exception:
                    pass

    if clicked:
        print(f"Đã mở rộng {clicked} review bị rút gọn")

    recover_if_left_google_maps(driver, "expand_more_buttons")
    close_unwanted_popups(driver)

def scroll_review_panel(driver):
    recover_if_left_google_maps(driver, "trước khi scroll")

    before_sig = review_dom_signature(driver)

    # Kéo mạnh hơn bản cũ. Google Maps thường chỉ tải thêm khi panel review nhận wheel thật.
    native_scroll_down(driver, amount=3600, times=5)

    # Fallback thêm vài lần JS scroll nếu native chưa làm danh sách review đổi.
    after_sig = review_dom_signature(driver)
    if before_sig == after_sig:
        for _ in range(3):
            js_scroll_review_panel(driver, amount=4200)
            time.sleep(0.45)

    recover_if_left_google_maps(driver, "sau khi scroll")


def extract_reviews(driver):
    reviews = []

    block_xpaths = [
        "//div[contains(@class,'jftiEf')]",
        "//div[@data-review-id]",
        "//div[contains(@aria-label,'sao') and ancestor::div[@data-review-id]]/ancestor::div[@data-review-id]",
        "//div[contains(@aria-label,'star') and ancestor::div[@data-review-id]]/ancestor::div[@data-review-id]",
        "//span[contains(text(),'/5')]/ancestor::div[contains(@class,'jftiEf') or @data-review-id][1]",
        "//span[contains(text(),'/5')]/ancestor::div[starts-with(@class,'GHT2ce') or contains(@class,'DU9Pgb')][1]/ancestor::div[1]",
    ]

    blocks = []

    for xpath in block_xpaths:
        try:
            found = driver.find_elements(By.XPATH, xpath)

            if found:
                blocks = found
                break
        except Exception:
            pass

    print(f"DEBUG: Tìm thấy {len(blocks)} review blocks")

    for block in blocks:
        reviewer_name = ""
        rating_text = ""
        comment = ""
        review_date = ""

        name_xpaths = [
            ".//div[contains(@class,'d4r55')]",
            ".//button[contains(@class,'WEBjve')]",
            ".//div[contains(@class,'WNxzHc')]",
            ".//*[contains(@aria-label,'Ảnh của')]/ancestor::div[2]//div",
            ".//a[contains(@class,'WNxzHc')]",
            ".//div[contains(@class,'fontHeadlineSmall')]",
        ]

        rating_xpaths = [
            ".//span[contains(@class,'kvMYJc')]",
            ".//span[contains(@aria-label,'sao')]",
            ".//span[contains(@aria-label,'star')]",
            ".//*[@role='img' and contains(@aria-label,'sao')]",
            ".//*[@role='img' and contains(@aria-label,'star')]",
            ".//span[contains(@class,'fzvQIb')]",
            ".//span[contains(@class,'fontBodyLarge') and contains(text(),'/5')]",
            ".//*[contains(text(),'/5')]",
        ]

        date_xpaths = [
            ".//span[contains(@class,'rsqaWe')]",
            ".//span[contains(text(),'trước')]",
            ".//span[contains(text(),'ago')]",
            ".//span[contains(text(),'tuần')]",
            ".//span[contains(text(),'tháng')]",
            ".//span[contains(text(),'năm')]",
        ]

        comment_xpaths = [
            ".//span[contains(@class,'wiI7pd')]",
            ".//div[contains(@class,'MyEned')]//span",
            ".//span[@lang]",
            ".//div[contains(@class,'MyEned')]",
            ".//div[contains(@class,'review-full-text')]",
        ]

        for xpath in name_xpaths:
            try:
                value = block.find_element(By.XPATH, xpath).text
                value = clean_text(value)

                if value:
                    reviewer_name = value
                    break
            except Exception:
                pass

        for xpath in rating_xpaths:
            try:
                el = block.find_element(By.XPATH, xpath)

                value = (
                    el.get_attribute("aria-label")
                    or el.get_attribute("title")
                    or el.text
                    or el.get_attribute("innerText")
                    or ""
                )

                value = clean_text(value)

                if value:
                    rating_text = value
                    break
            except Exception:
                pass

        for xpath in date_xpaths:
            try:
                value = block.find_element(By.XPATH, xpath).text
                value = clean_text(value)

                if value:
                    review_date = value
                    break
            except Exception:
                pass

        for xpath in comment_xpaths:
            try:
                value = block.find_element(By.XPATH, xpath).text
                value = clean_text(value)

                if value:
                    comment = value
                    break
            except Exception:
                pass

        reviewer_name = clean_text(reviewer_name)
        comment = clean_text(comment)
        review_date = clean_text(review_date)
        rating = rating_to_number(rating_text)

       # Bỏ luôn review không có bình luận thật
        if not comment:
           continue
 
        if reviewer_name or rating:
          reviews.append({
        "reviewerName": reviewer_name or "Người dùng Google",
        "rating": rating,
        "comment": comment,
        "googleDateText": review_date,
    })

    return reviews


def save_reviews_to_txt(reviews):
    seen = set()
    unique_reviews = []

    for r in reviews:
        key = (
            r.get("reviewerName", ""),
            r.get("rating", 0),
            r.get("comment", "")
        )

        if key in seen:
            continue

        seen.add(key)

        unique_reviews.append(r)

    unique_reviews = unique_reviews[:MAX_REVIEWS]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for index, r in enumerate(unique_reviews, start=1):
            # IMPORTANT: ID phải có cả prefix loại dịch vụ để tránh trùng giữa
            # KS-005, PT-005, TH-005...
            # Cũ: GM-005-001  -> dễ đụng nhau
            # Mới: GM-KS-005-001 / GM-PT-005-001
            review_id = f"GM-{OPERATOR_CODE}-{index:03d}"

            item = {
                "id": review_id,

                "operatorCode": OPERATOR_CODE,
                "operatorName": TARGET_NAME,
                "partnerCode": OPERATOR_CODE,
                "partnerName": TARGET_NAME,
                "ownerPartnerCode": OWNER_PARTNER_CODE,
                "assignedOperatorCode": OPERATOR_CODE,

                "category": CATEGORY_NAME,
                "targetCode": TARGET_CODE,
                "targetName": TARGET_NAME,

                "reviewerName": r.get("reviewerName", "Người dùng Google"),
                "rating": r.get("rating", 0),
                "comment": r.get("comment", ""),

                "visibility": "hidden",
                "sourceSystem": SOURCE_SYSTEM,
                "moderationStatus": moderation_status(
                    r.get("rating"),
                    r.get("comment")
                ),

                "createdAt": now_iso(),

                "rawPayload": {
                    "source": SOURCE_SYSTEM,
                    "googleDateText": r.get("googleDateText", ""),
                    "searchKeyword": SEARCH_KEYWORD,
                    "googleMapsSearchText": GOOGLE_MAPS_SEARCH_TEXT,
                    "operatorCode": OPERATOR_CODE,
                    "operatorName": TARGET_NAME,
                    "category": CATEGORY_NAME,
                    "ratingRaw": r.get("rating", 0)
                }
            }

            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print("\n====================================")
    print("Đã tạo file TXT:")
    print(OUTPUT_FILE)
    print(f"Tổng review unique: {len(unique_reviews)}")
    print("Status: pending_review")
    print("Visibility: hidden")
    print("====================================")




def extract_bg_url(style_value):
    if not style_value:
        return ""

    match = re.search(r'url\(["\']?(.*?)["\']?\)', style_value)
    if not match:
        return ""

    return match.group(1).replace("&quot;", "").strip()


def upgrade_google_image_url(url):
    """Đổi ảnh thumbnail Google Maps thành ảnh lớn hơn để lưu rõ hơn."""
    if not url:
        return ""

    return re.sub(r"=w\d+-h\d+[^&\s]*$", "=w1200-h1200-p-k-no", url)


def find_review_blocks(driver):
    block_xpaths = [
        "//div[contains(@class,'jftiEf')]",
        "//div[@data-review-id]",
    ]

    for xpath in block_xpaths:
        try:
            found = driver.find_elements(By.XPATH, xpath)
            if found:
                return found
        except Exception:
            pass

    return []


def get_review_identity(block):
    try:
        review_id = (block.get_attribute("data-review-id") or "").strip()
        if review_id:
            return review_id
    except Exception:
        pass

    try:
        review_id = (
            block.find_element(By.XPATH, ".//*[@data-review-id]")
            .get_attribute("data-review-id")
            .strip()
        )
        if review_id:
            return review_id
    except Exception:
        pass

    try:
        text = clean_text(block.text)
        if text:
            return str(hash(text))
    except Exception:
        pass

    return str(time.time())


def extract_review_photo_items(driver, seen_photo_review_ids, start_review_number):
    """
    Logic từ file lấy ảnh:
    - Đếm theo thứ tự review thật trên Google Maps.
    - Review không có ảnh vẫn tính số thứ tự.
    - Mỗi review chỉ lấy ảnh đầu tiên.
    - Review 1 không ảnh, review 6 có ảnh => lưu 6.webp.
    """
    results = []
    blocks = find_review_blocks(driver)
    review_number = start_review_number

    print(f"DEBUG IMAGE: Tìm thấy {len(blocks)} review blocks")

    for block in blocks:
        review_id = get_review_identity(block)

        if review_id in seen_photo_review_ids:
            continue

        current_review_number = review_number
        review_number += 1
        seen_photo_review_ids.add(review_id)

        try:
            photo_buttons = block.find_elements(
                By.XPATH,
                ".//button[contains(@class,'Tya61d') and contains(@style,'background-image')]"
            )
        except Exception:
            photo_buttons = []

        if not photo_buttons:
            print(f"⏭️  Review #{current_review_number}: không có ảnh")
            continue

        first_photo = None
        for btn in photo_buttons:
            try:
                if (btn.get_attribute("data-photo-index") or "") == "0":
                    first_photo = btn
                    break
            except Exception:
                pass

        if first_photo is None:
            first_photo = photo_buttons[0]

        style = first_photo.get_attribute("style") or ""
        raw_url = extract_bg_url(style)
        photo_url = upgrade_google_image_url(raw_url)

        if photo_url:
            print(f"📷 Review #{current_review_number}: có ảnh")
            results.append((review_id, current_review_number, photo_url))
        else:
            print(f"⏭️  Review #{current_review_number}: có block ảnh nhưng không lấy được URL")

    return results, review_number


def download_image_as_webp(url, output_path):
    if requests is None or Image is None:
        raise RuntimeError(
            "Thiếu thư viện requests hoặc pillow. Cài bằng: python -m pip install requests pillow"
        )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0 Safari/537.36"
        ),
        "Referer": "https://www.google.com/maps",
    }

    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    tmp_path = output_path + ".tmp"

    with open(tmp_path, "wb") as f:
        f.write(response.content)

    try:
        with Image.open(tmp_path) as img:
            img = img.convert("RGB")
            img.thumbnail((1000, 1000))
            img.save(output_path, "WEBP", quality=82, method=6)

        try:
            os.remove(tmp_path)
        except Exception:
            pass

        return True

    except Exception as error:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

        print(f"❌ Lỗi convert ảnh: {error}")
        return False


def save_new_review_photos(photo_items, seen_photo_urls, output_dir, saved_images):
    if not SAVE_REVIEW_IMAGES:
        return saved_images

    if not photo_items:
        return saved_images

    os.makedirs(output_dir, exist_ok=True)

    for review_id, current_review_number, url in photo_items:
        if saved_images >= MAX_IMAGES:
            break

        if not url or url in seen_photo_urls:
            continue

        seen_photo_urls.add(url)
        output_path = os.path.join(output_dir, f"{current_review_number}.webp")

        if os.path.exists(output_path):
            print(f"↻ Bỏ qua ảnh đã tồn tại: {os.path.basename(output_path)}")
            continue

        print(f"⬇️  Review #{current_review_number} => {current_review_number}.webp")
        print(f"   {url[:120]}...")

        try:
            ok = download_image_as_webp(url, output_path)
        except Exception as error:
            ok = False
            print(f"❌ Lỗi tải ảnh: {error}")

        if ok:
            print(f"✅ Saved image: {output_path}")
            saved_images += 1
        else:
            print("❌ Skip ảnh lỗi")

        time.sleep(random.uniform(0.35, 0.9))

    return saved_images

def make_review_key(review):
    return (
        clean_text(review.get("reviewerName", "")).lower(),
        int(review.get("rating", 0) or 0),
        clean_text(review.get("comment", "")).lower(),
    )


def main():
    driver = setup_driver()

    try:
        print("Đang tìm địa điểm...")

        search_place(driver)

        print("Đang mở tab Bài đánh giá...")

        click_review_tab(driver)

        all_reviews = []
        seen_keys = set()

        seen_photo_review_ids = set()
        seen_photo_urls = set()
        image_review_number = 1
        saved_images = 0

        last_total = 0
        same_count = 0

        print("Đang crawl reviews và ảnh review...\n")

        for i in range(MAX_SCROLL_ROUNDS):
            recover_if_left_google_maps(driver, "đầu vòng crawl")
            close_unwanted_popups(driver)
            expand_more_buttons(driver)

            reviews = extract_reviews(driver)

            if SAVE_REVIEW_IMAGES and saved_images < MAX_IMAGES:
                photo_items, image_review_number = extract_review_photo_items(
                    driver,
                    seen_photo_review_ids,
                    image_review_number,
                )
                saved_images = save_new_review_photos(
                    photo_items,
                    seen_photo_urls,
                    OUTPUT_IMAGE_DIR,
                    saved_images,
                )

            added = 0
            for review in reviews:
                key = make_review_key(review)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                all_reviews.append(review)
                added += 1

            if len(all_reviews) >= MAX_REVIEWS:
                all_reviews = all_reviews[:MAX_REVIEWS]
                print(f"\nĐã đạt giới hạn {MAX_REVIEWS} reviews")
                break

            print(
                f"Đang scroll lần {i + 1}: DOM {len(reviews)} | text mới +{added} | tổng text {len(all_reviews)} | ảnh đã lưu {saved_images}",
                flush=True
            )

            scroll_review_panel(driver)

            time.sleep(random.uniform(SCROLL_WAIT_MIN, SCROLL_WAIT_MAX))

            if len(all_reviews) == last_total:
                same_count += 1
            else:
                same_count = 0

            last_total = len(all_reviews)

            if same_count >= 5:
                print("\nKhông còn review mới.")
                break

        save_reviews_to_txt(all_reviews)

        print("\n====================================")
        print(f"TOTAL TEXT SAVED : {len(all_reviews[:MAX_REVIEWS])}")
        print(f"TOTAL IMAGE SAVED: {saved_images}")
        print(f"IMAGE FOLDER     : {OUTPUT_IMAGE_DIR}")
        print("====================================")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
