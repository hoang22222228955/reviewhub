/* ReviewHub Partner AI Summary Embed */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var apiBase = (script.getAttribute('data-api-base') || '').replace(/\/$/, '');
  var apiKey = script.getAttribute('data-api-key') || '';
  var targetCode = script.getAttribute('data-target-code') || '';
  var title = script.getAttribute('data-title') || 'AI tóm tắt đánh giá';

  if (!apiBase || !apiKey || !targetCode) {
    console.warn('[ReviewHub AI Embed] Thiếu cấu hình nhúng.');
    return;
  }

  var root = document.createElement('div');
  root.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;width:min(360px,calc(100vw - 28px));font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  root.innerHTML =
    '<button data-rh-toggle style="width:100%;border:0;border-radius:18px;padding:13px 15px;background:#0d2b52;color:#fff;font-weight:700;box-shadow:0 14px 34px rgba(13,43,82,.24);cursor:pointer;text-align:left">' +
      title +
      '<span style="float:right;opacity:.8">AI</span>' +
    '</button>' +
    '<div data-rh-panel style="display:none;margin-top:10px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 18px 46px rgba(15,23,42,.16);overflow:hidden">' +
      '<div style="padding:14px 15px;border-bottom:1px solid #eef1f5">' +
        '<strong style="display:block;color:#17233c;font-size:14px">Tóm tắt đánh giá</strong>' +
        '<span style="display:block;margin-top:3px;color:#64748b;font-size:12px">Dữ liệu tổng hợp từ review đã kiểm duyệt</span>' +
      '</div>' +
      '<div data-rh-content style="padding:14px 15px;color:#334155;font-size:13px;line-height:1.55">Đang tải dữ liệu...</div>' +
    '</div>';

  document.body.appendChild(root);

  var button = root.querySelector('[data-rh-toggle]');
  var panel = root.querySelector('[data-rh-panel]');
  var content = root.querySelector('[data-rh-content]');
  var loaded = false;

  function safe(value) {
    return String(value || '').replace(/[<>]/g, '');
  }

  function list(items) {
    items = items || [];
    if (!items.length) return '<p style="margin:6px 0;color:#64748b">Chưa đủ dữ liệu.</p>';

    return '<ul style="margin:6px 0 0;padding-left:18px">' + items.slice(0, 3).map(function (item) {
      return '<li style="margin:4px 0">' + safe(item) + '</li>';
    }).join('') + '</ul>';
  }

  function render(data) {
    data = data || {};
    content.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
        '<div><b style="display:block;font-size:18px;color:#0f172a">' + (data.totalReviews || 0) + '</b><span style="color:#64748b;font-size:11px">Review</span></div>' +
        '<div><b style="display:block;font-size:18px;color:#16a34a">' + (data.goodReviews || 0) + '</b><span style="color:#64748b;font-size:11px">Tốt</span></div>' +
        '<div><b style="display:block;font-size:18px;color:#dc2626">' + (data.badReviews || 0) + '</b><span style="color:#64748b;font-size:11px">Cần theo dõi</span></div>' +
      '</div>' +
      '<p style="margin:0 0 8px;color:#64748b">Điểm trung bình: <b style="color:#0f172a">' + (data.averageRating || 0) + '/5</b></p>' +
      '<h4 style="margin:10px 0 0;font-size:13px;color:#0f172a">Điểm được khen</h4>' + list(data.goodPoints) +
      '<h4 style="margin:12px 0 0;font-size:13px;color:#0f172a">Vấn đề cần theo dõi</h4>' + list(data.badPoints) +
      '<h4 style="margin:12px 0 0;font-size:13px;color:#0f172a">Gợi ý cải thiện</h4>' + list(data.suggestions) +
      '<p style="margin:12px 0 0;color:#94a3b8;font-size:11px">Chỉ hiển thị bản tổng hợp, không trả raw review.</p>';
  }

  function load() {
    if (loaded) return;
    loaded = true;

    fetch(apiBase + '/api/v1/ai/review-summary?targetCode=' + encodeURIComponent(targetCode), {
      headers: { 'X-Api-Key': apiKey }
    })
      .then(function (response) { return response.json(); })
      .then(function (json) {
        if (json.error) throw new Error(json.error);
        render(json.data || json);
      })
      .catch(function (error) {
        content.innerHTML = '<p style="margin:0;color:#b91c1c">Không tải được dữ liệu: ' + safe(error.message || error) + '</p>';
      });
  }

  button.addEventListener('click', function () {
    var open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    if (!open) load();
  });
})();
