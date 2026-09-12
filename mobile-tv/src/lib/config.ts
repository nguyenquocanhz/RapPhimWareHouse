/**
 * Cau hinh app.
 *
 * STANDALONE = true: ban DOC LAP, khong can backend rieng. App goi thang KKPhim
 * (phimapi.com) cho phim va iptv-org cho truyen hinh. Dung de phat hanh rong rai.
 *
 * STANDALONE = false: ban dung backend RapPhim trong mang nha (client mong).
 */
export const STANDALONE = true;

// --- Backend rieng (chi dung khi STANDALONE = false) ------------------------
export const DEFAULT_HOST = process.env.EXPO_PUBLIC_HOST ?? "192.168.100.169";
export const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "7101";
export const DEFAULT_WEB_PORT = process.env.EXPO_PUBLIC_WEB_PORT ?? "7100";

/** Nguon mac dinh khi mo app. */
export const DEFAULT_PROVIDER = "kkphim";

// --- Nguon truc tiep (ban STANDALONE) --------------------------------------
export const KKPHIM_API = "https://phimapi.com";
export const KKPHIM_CDN = "https://phimimg.com";

// --- Premium ----------------------------------------------------------------
/**
 * Khoa cong khai Ed25519 cua tac gia (base64). Khoa BI MAT dung de tao ma kich hoat,
 * KHONG bao gio dat vao app (xem tools/gen-license.js). App chi CHUC THUC chu ky ma
 * kich hoat bang khoa cong khai nay - nen khong can may chu de kiem tra.
 */
export const PREMIUM_PUBLIC_KEY = "zuD+73umBpe2POQQRub1orW3O6/jVes+IOmsfh2hU1A=";

/**
 * URL license server (Cloudflare Worker) de QUAN LY key: cap / thu hoi / gia han /
 * het han (thue bao cat dan). De TRONG = che do offline (ma da ky Ed25519, khong thu
 * hoi duoc). Dat URL Worker vao day de chuyen sang che do quan ly qua may chu.
 *   vi du: "https://rapphim-license.<tai-khoan>.workers.dev"
 */
export const LICENSE_API = "";

/** Cac tinh nang chi danh cho Premium. */
export const PREMIUM_FEATURES = {
  liveTv: true, // Truyen hinh truc tiep chi cho Premium
} as const;

/**
 * Thong tin de nguoi dung ung ho tac gia (hien o man Premium). Tac gia tu dien lai.
 * Khong dat so tai khoan that vao ma nguon cong khai neu ban se chia se repo.
 */
export const SUPPORT_INFO = {
  note: "Ủng hộ tác giả để duy trì máy chủ & cập nhật nguồn phim.",
  contact: "Liên hệ tác giả để nhận mã Premium.",
};
