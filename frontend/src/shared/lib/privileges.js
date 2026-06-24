/**
 * privileges.js
 * Định nghĩa tất cả privilege key của hệ thống.
 * Dùng chung cho: PlanEditor, PartnerSidebar, PricingPage, AuthContext, routes.
 */

// ─── Danh sách key ──────────────────────────────────────────────────────────

export const P = {
  READ_PUBLIC:      'READ_PUBLIC',
  READ_PRIVATE:     'READ_PRIVATE',
  WRITE_REVIEW:     'WRITE_REVIEW',
  AI_MODERATION:    'AI_MODERATION',
  SUPPORT_PRIVATE:  'SUPPORT_PRIVATE',
  SLA:              'SLA',
  DOMAIN_EXPAND:    'DOMAIN_EXPAND',
}

// ─── Metadata (nhãn hiển thị + icon) ────────────────────────────────────────

export const PRIVILEGE_META = {
  [P.READ_PUBLIC]:     { label: 'Đọc dữ liệu public',       icon: '', group: 'Cơ bản' },
  [P.READ_PRIVATE]:    { label: 'Dữ liệu private riêng',     icon: '', group: 'Nâng cao' },
  [P.WRITE_REVIEW]:    { label: 'Gửi review mới',             icon: '',  group: 'Nâng cao' },
  [P.AI_MODERATION]:   { label: 'AI moderation văn bản',      icon: '', group: 'Nâng cao' },
  [P.SUPPORT_PRIVATE]: { label: 'Hỗ trợ kỹ thuật riêng',     icon: '',  group: 'Doanh nghiệp' },
  [P.SLA]:             { label: 'Theo dõi SLA',               icon: '', group: 'Doanh nghiệp' },
  [P.DOMAIN_EXPAND]:   { label: 'Mở rộng domain',             icon: '', group: 'Doanh nghiệp' },
}

// Thứ tự hiển thị trong UI
export const PRIVILEGE_ORDER = [
  P.READ_PUBLIC,
  P.READ_PRIVATE,
  P.WRITE_REVIEW,
  P.AI_MODERATION,
  P.SUPPORT_PRIVATE,
  P.SLA,
  P.DOMAIN_EXPAND,
]

// ─── Ánh xạ route → privilege yêu cầu (null = mọi partner đều vào được) ───

export const ROUTE_PRIVILEGE = {
  'gui-review': P.WRITE_REVIEW,
  'lay-review': null,
  'khoa-api':   null,
  'dac-quyen':  null,
  'lich-su-mua': null,
  'theo-doi-sla': P.SLA,
  'domain': P.DOMAIN_EXPAND,
}

// ─── Privileges mặc định theo gói (dùng để seed UI khi chưa có DB) ──────────

export const DEFAULT_PLAN_PRIVILEGES = {
  starter:    [P.READ_PUBLIC],
  growth:     [P.READ_PUBLIC, P.READ_PRIVATE, P.WRITE_REVIEW, P.AI_MODERATION],
  enterprise: [P.READ_PUBLIC, P.READ_PRIVATE, P.WRITE_REVIEW, P.AI_MODERATION, P.SUPPORT_PRIVATE, P.SLA, P.DOMAIN_EXPAND],
}
