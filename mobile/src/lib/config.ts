/**
 * Giá trị mặc định cho địa chỉ backend. Người dùng có thể đổi trong màn Cài đặt
 * (lưu lại bằng AsyncStorage — xem settings.ts). Cũng có thể đặt qua biến môi trường
 * EXPO_PUBLIC_* khi chạy dev.
 *
 * App là client mỏng: chỉ gọi REST API có sẵn, không nhúng dữ liệu.
 */
export const DEFAULT_HOST = process.env.EXPO_PUBLIC_HOST ?? "192.168.100.169";
export const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "7101";
export const DEFAULT_WEB_PORT = process.env.EXPO_PUBLIC_WEB_PORT ?? "7100";

/** Nguồn mặc định khi mở app. */
export const DEFAULT_PROVIDER = "kkphim";
