# -*- coding: utf-8 -*-
"""
dowanh.py

Mục đích:
- Nhập mã như PT-001 / KS-001 / MB-001... hoặc nhập tên.
- Nếu nhập mã, script đọc seed-operators.js để lấy tên thật rồi mới search Google Maps.
  Ví dụ: PT-001 -> VeXeNhanh -> search "Nhà xe VeXeNhanh"
- Chỉ lấy ảnh trong review Google Maps, không lấy text đánh giá.
- Mỗi review chỉ lấy 1 ảnh đầu tiên.
- Tên ảnh lưu theo số thứ tự review thật:
  Review 1 không ảnh -> bỏ qua 1.webp
  Review 6 có ảnh   -> lưu 6.webp

Cài thư viện:
  python -m pip install selenium webdriver-manager requests pillow

Chạy:
  python dowanh.py "PT-001" 200
  python dowanh.py "PT-040" 300
  python dowanh.py "Như Vinh" 300
"""

import io
import random
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager


try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass


INPUT_KEYWORD = sys.argv[1] if len(sys.argv) > 1 else "PT-001"

try:
    MAX_IMAGES = int(sys.argv[2]) if len(sys.argv) > 2 else 200
except Exception:
    MAX_IMAGES = 200

# Tuỳ chọn thứ 3 do run.bat truyền vào:
# PT / KS / MB / TH / TO / DV
# Dùng để giới hạn tìm đúng nhóm nhà xe/khách sạn/máy bay/tàu hỏa/tour/dịch vụ khác.
SELECTED_PREFIX = sys.argv[3].upper().strip() if len(sys.argv) > 3 else ""


SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent

SEED_OPERATORS_FILE = SCRIPT_DIR / "seed-operators.js"
if not SEED_OPERATORS_FILE.exists():
    alt_seed = ROOT_DIR / "seed-operators.js"
    if alt_seed.exists():
        SEED_OPERATORS_FILE = alt_seed

PUBLIC_REVIEW_IMAGE_ROOT = ROOT_DIR / "frontend" / "public" / "anhdanggia"

CATEGORY_BY_PREFIX = {
    "PT": "nhaxe",
    "KS": "khachsan",
    "MB": "maybay",
    "TH": "tauhoa",
    "TO": "tour",
    "DV": "dichvukhac",
}

SERVICE_SEARCH_PREFIX_BY_CATEGORY = {
    "PT": "Xe khách",
    "KS": "Khách sạn",
    "MB": "Hãng bay",
    "TH": "Tàu hỏa",
    "TO": "Tour",
    "DV": "",
}


def clean_text(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def normalize_text(value):
    text = str(value or "").lower().strip()
    text = text.replace("đ", "d")
    return re.sub(r"\s+", " ", text)


def normalize_compact(value):
    return re.sub(r"[^a-z0-9]+", "", normalize_text(value))


def tokenize(value):
    return [item for item in re.split(r"[^a-z0-9]+", normalize_text(value)) if item]


def remove_service_words(keyword):
    text = normalize_text(keyword)

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


def load_operators_from_seed():
    if not SEED_OPERATORS_FILE.exists():
        raise FileNotFoundError(f"Không tìm thấy seed-operators.js tại: {SEED_OPERATORS_FILE}")

    content = SEED_OPERATORS_FILE.read_text(encoding="utf-8", errors="ignore")
    pattern = r"\{\s*code:\s*['\"]([^'\"]+)['\"]\s*,\s*name:\s*['\"]([^'\"]+)['\"]"
    matches = re.findall(pattern, content)

    operators = []
    for code, name in matches:
        operators.append(
            {
                "operatorCode": code.strip(),
                "operatorName": name.strip(),
            }
        )

    if not operators:
        raise RuntimeError("Không đọc được mã nào trong seed-operators.js")

    return operators


def find_operator(input_keyword):
    operators = load_operators_from_seed()

    if SELECTED_PREFIX:
        operators = [
            op for op in operators
            if str(op.get("operatorCode", "")).upper().startswith(f"{SELECTED_PREFIX}-")
        ]

        if not operators:
            raise RuntimeError(
                f"Không có dữ liệu nào trong seed-operators.js thuộc nhóm {SELECTED_PREFIX}."
            )

    raw_keyword = str(input_keyword or "").strip()
    keyword = normalize_text(raw_keyword)
    clean_keyword = remove_service_words(raw_keyword)

    print("DEBUG FIND OPERATOR")
    print(f"Seed file     : {SEED_OPERATORS_FILE}")
    print(f"Input keyword : {raw_keyword}")
    print(f"Selected group: {SELECTED_PREFIX or 'ALL'}")
    print(f"Clean keyword : {clean_keyword}")

    # 1. Nhập mã PT-001 / KS-001 thì match mã trước.
    for op in operators:
        op_code = normalize_text(op["operatorCode"])
        if op_code == keyword or op_code == clean_keyword:
            print(f"✓ Match code: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 2. Match đúng tên.
    for op in operators:
        op_name = normalize_text(op["operatorName"])
        if op_name == clean_keyword:
            print(f"✓ Match exact name: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 3. Keyword nằm trong tên.
    for op in operators:
        op_name = normalize_text(op["operatorName"])
        if clean_keyword and clean_keyword in op_name:
            print(f"✓ Match keyword in name: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 4. Tên nằm trong keyword.
    for op in operators:
        op_name = normalize_text(op["operatorName"])
        if op_name and op_name in clean_keyword:
            print(f"✓ Match name in keyword: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 5. Compact match.
    compact_keyword = normalize_compact(clean_keyword)
    for op in operators:
        compact_name = normalize_compact(op["operatorName"])
        if compact_keyword and (compact_keyword in compact_name or compact_name in compact_keyword):
            print(f"✓ Match compact: {op['operatorCode']} - {op['operatorName']}")
            return op

    # 6. Token match.
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
    print("Một số mã/tên đang có trong seed:")
    for op in operators[:120]:
        print(f"- {op['operatorCode']} - {op['operatorName']}")

    raise RuntimeError(
        f"Không tìm thấy '{input_keyword}' trong seed-operators.js. "
        f"Hãy nhập đúng mã hoặc tên, ví dụ: PT-040 hoặc Như Vinh."
    )


def category_slug_from_code(operator_code):
    prefix = str(operator_code or "").split("-")[0].upper()
    return CATEGORY_BY_PREFIX.get(prefix, "dichvukhac")


def make_google_maps_search_text(operator):
    operator_code = operator["operatorCode"]
    operator_name = operator["operatorName"]
    prefix = str(operator_code or "").split("-")[0].upper()
    service_prefix = SERVICE_SEARCH_PREFIX_BY_CATEGORY.get(prefix, "")

    # Đoạn HTML ảnh review của khách sạn vẫn dùng button.Tya61d + background-image
    # giống nhà xe, nên phần lấy ảnh không cần sửa.
    # Chỉ khác phần search Google Maps: thêm tiền tố đúng loại dịch vụ để tìm chính xác hơn.
    if service_prefix:
        return f"{service_prefix} {operator_name}"

    return operator_name


def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument("--lang=vi-VN")
    options.add_argument("--disable-blink-features=AutomationControlled")

    # Muốn chạy ẩn Chrome thì mở dòng dưới:
    # options.add_argument("--headless=new")

    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options,
    )


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


def search_place(driver, google_maps_search_text):
    driver.get("https://www.google.com/maps")

    wait = WebDriverWait(driver, 30)
    search_input = wait.until(
        EC.presence_of_element_located((By.XPATH, "//input[@role='combobox']"))
    )

    search_input.clear()

    print(f"🔎 Search Google Maps bằng tên: {google_maps_search_text}")
    search_input.send_keys(google_maps_search_text)
    time.sleep(1)
    search_input.send_keys(Keys.ENTER)
    time.sleep(7)

    print("Đang chọn kết quả có nhiều bài đánh giá nhất...")

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

    for card in result_cards:
        try:
            name = card.find_element(By.XPATH, ".//div[contains(@class,'qBF1Pd')]").text
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
        print(f"- {name}: {review_count} reviews")

        if review_count > best_review_count:
            best_review_count = review_count
            best_card = card
            best_name = name

    if not best_card:
        print("Không tìm thấy kết quả phù hợp")
        return

    print("")
    print("====================================")
    print("ĐÃ CHỌN")
    print(best_name)
    print(f"{best_review_count} reviews")
    print("====================================")
    print("")

    clicked = False

    link_xpaths = [
        ".//a[contains(@class,'hfpxzc')]",
        ".//a[contains(@href,'/maps/place')]",
        ".//a[contains(@href,'google.com/maps')]",
        ".//a[@href]",
    ]

    for xpath in link_xpaths:
        try:
            link = best_card.find_element(By.XPATH, xpath)
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", link)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", link)
            clicked = True
            print("Đã click vào link địa điểm.")
            break
        except Exception:
            pass

    if not clicked:
        try:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", best_card)
            time.sleep(1)
            driver.execute_script("arguments[0].click();", best_card)
            clicked = True
            print("Không thấy link, đã click trực tiếp vào card.")
        except Exception as error:
            print("Không click được card kết quả.")
            print(str(error))

    if not clicked:
        raise RuntimeError("Không thể mở địa điểm Google Maps.")

    time.sleep(7)


def click_review_tab(driver):
    wait = WebDriverWait(driver, 30)

    review_xpaths = [
        "//button[@role='tab' and contains(@aria-label,'Bài đánh giá')]",
        "//button[@role='tab' and contains(.,'Bài đánh giá')]",
        "//button[contains(@aria-label,'Bài đánh giá')]",
        "//button[contains(.,'Bài đánh giá')]",
        "//button[@role='tab' and contains(@aria-label,'Reviews')]",
        "//button[@role='tab' and contains(.,'Reviews')]",
        "//*[self::button or self::div][contains(.,'Bài đánh giá')]",
        "//*[self::button or self::div][contains(.,'Reviews')]",
    ]

    last_error = None

    for xpath in review_xpaths:
        try:
            review_tab = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
            driver.execute_script("arguments[0].click();", review_tab)
            time.sleep(4)
            print("Đã mở tab Bài đánh giá.")
            return
        except Exception as error:
            last_error = error

    raise RuntimeError(f"Không mở được tab Bài đánh giá: {last_error}")


def scroll_review_panel(driver):
    driver.execute_script(
        """
        const candidates = Array.from(document.querySelectorAll(
            'div[role="main"] div, div[role="feed"], div.m6QErb, div[aria-label]'
        ));

        const scrollables = candidates
            .filter(el => el && el.scrollHeight > el.clientHeight + 80)
            .sort((a, b) => b.scrollHeight - a.scrollHeight);

        const target = scrollables[0];

        if (target) {
            target.scrollTop = target.scrollHeight;
            target.dispatchEvent(new WheelEvent('wheel', {
                bubbles: true,
                cancelable: true,
                deltaY: 1600
            }));
        }

        window.scrollBy(0, 900);
        """
    )


def extract_bg_url(style_value):
    if not style_value:
        return ""

    match = re.search(r'url\(["\']?(.*?)["\']?\)', style_value)
    if not match:
        return ""

    return match.group(1).replace("&quot;", "").strip()


def upgrade_google_image_url(url):
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


def extract_review_photo_items(driver, seen_review_ids, start_review_number):
    """
    Đếm tất cả review đã lướt qua.
    Review không có ảnh vẫn được tính số thứ tự.
    """
    results = []
    blocks = find_review_blocks(driver)
    review_number = start_review_number

    print(f"DEBUG: Tìm thấy {len(blocks)} review blocks")

    for block in blocks:
        try:
            review_id = (block.get_attribute("data-review-id") or "").strip()
            if not review_id:
                review_id = (
                    block.find_element(By.XPATH, ".//*[@data-review-id]")
                    .get_attribute("data-review-id")
                    .strip()
                )
        except Exception:
            review_id = ""

        if not review_id:
            review_id = str(hash(block.text))

        if review_id in seen_review_ids:
            continue

        current_review_number = review_number
        review_number += 1
        seen_review_ids.add(review_id)

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
            if (btn.get_attribute("data-photo-index") or "") == "0":
                first_photo = btn
                break

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

    tmp_path = output_path.with_suffix(".tmp")
    tmp_path.write_bytes(response.content)

    try:
        with Image.open(tmp_path) as img:
            img = img.convert("RGB")
            img.thumbnail((1000, 1000))

            output_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(output_path, "WEBP", quality=82, method=6)

        tmp_path.unlink(missing_ok=True)
        return True

    except Exception as error:
        tmp_path.unlink(missing_ok=True)
        print(f"❌ Lỗi convert ảnh: {error}")
        return False


def crawl_photos(driver, output_dir):
    seen_review_ids = set()
    seen_urls = set()
    saved = 0
    review_number = 1
    no_new_round = 0

    output_dir.mkdir(parents=True, exist_ok=True)

    print("")
    print("====================================")
    print("BẮT ĐẦU LẤY ẢNH REVIEW")
    print(f"Output folder : {output_dir}")
    print("Đặt tên ảnh   : theo số thứ tự review thật")
    print("Ví dụ         : lướt 5 review không ảnh, review 6 có ảnh => lưu 6.webp")
    print(f"Max images    : {MAX_IMAGES}")
    print("====================================")
    print("")

    for round_index in range(1, 220):
        print(f"\n--- Scroll vòng {round_index} ---")

        items, review_number = extract_review_photo_items(
            driver,
            seen_review_ids,
            review_number,
        )

        new_items = []
        for review_id, current_review_number, url in items:
            if url and url not in seen_urls:
                seen_urls.add(url)
                new_items.append((review_id, current_review_number, url))

        print(f"Tìm thấy ảnh mới trong vòng này: {len(new_items)}")
        print(f"Đã lướt qua tổng số review: {review_number - 1}")

        if not items:
            no_new_round += 1
        else:
            no_new_round = 0

        for review_id, current_review_number, url in new_items:
            if saved >= MAX_IMAGES:
                break

            output_path = output_dir / f"{current_review_number}.webp"

            if output_path.exists():
                print(f"↻ Bỏ qua vì đã tồn tại: {output_path.name}")
                continue

            print(f"⬇️  Review #{current_review_number} => {current_review_number}.webp")
            print(f"   {url[:120]}...")

            try:
                ok = download_image_as_webp(url, output_path)
            except Exception as error:
                ok = False
                print(f"❌ Lỗi tải ảnh: {error}")

            if ok:
                print(f"✅ Saved: {output_path}")
                saved += 1
            else:
                print("❌ Skip ảnh lỗi")

            time.sleep(random.uniform(0.5, 1.2))

        if saved >= MAX_IMAGES:
            print("Đã đủ số ảnh yêu cầu.")
            break

        if no_new_round >= 10:
            print("Không thấy review mới sau nhiều vòng scroll. Dừng.")
            break

        scroll_review_panel(driver)
        time.sleep(random.uniform(2.0, 3.5))

    print("")
    print("====================================")
    print(f"XONG: Đã lưu {saved} ảnh")
    print(f"Đã lướt qua review: {review_number - 1}")
    print(f"Folder: {output_dir}")
    print("====================================")


def main():
    selected_operator = find_operator(INPUT_KEYWORD)

    operator_code = selected_operator["operatorCode"]
    operator_name = selected_operator["operatorName"]
    category_slug = category_slug_from_code(operator_code)
    google_maps_search_text = make_google_maps_search_text(selected_operator)

    output_dir = PUBLIC_REVIEW_IMAGE_ROOT / category_slug / operator_code

    print("")
    print("====================================")
    print("DỊCH VỤ ĐANG LẤY ẢNH")
    print(f"Input keyword      : {INPUT_KEYWORD}")
    print(f"Operator code      : {operator_code}")
    print(f"Operator name      : {operator_name}")
    print(f"Google Maps search : {google_maps_search_text}")
    print(f"Category slug      : {category_slug}")
    print(f"Output dir         : {output_dir}")
    print(f"MAX_IMAGES         : {MAX_IMAGES}")
    print("====================================")
    print("")

    driver = setup_driver()

    try:
        search_place(driver, google_maps_search_text)
        click_review_tab(driver)
        time.sleep(2)
        crawl_photos(driver, output_dir)
    finally:
        print("Đóng Chrome...")
        try:
            driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    main()
