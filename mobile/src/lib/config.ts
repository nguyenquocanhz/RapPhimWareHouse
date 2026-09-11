/**
 * Dia chi backend. App la client mong: chi goi REST API co san, khong nhung du lieu.
 *
 * Backend homelab chay o cong 7101 (API) va 7100 (web). Anh poster cua kho rieng la
 * URL tuong doi (/api/thumbnail/...) do web phuc vu, nen can them WEB_BASE khi resolve.
 *
 * Doi dia chi o day (hoac dat qua bien moi truong EXPO_PUBLIC_*) cho khop mang cua ban.
 * May that / dien thoai that phai cung mang LAN voi homelab moi goi duoc.
 */
const HOST = process.env.EXPO_PUBLIC_HOST ?? "192.168.100.169";

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? `http://${HOST}:7101/api/v1`;
export const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE ?? `http://${HOST}:7100`;

/** Nguon mac dinh khi mo app. */
export const DEFAULT_PROVIDER = "kkphim";
