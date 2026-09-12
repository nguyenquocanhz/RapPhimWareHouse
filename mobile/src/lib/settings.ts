import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_API_PORT, DEFAULT_HOST, DEFAULT_WEB_PORT } from "./config";

/**
 * Địa chỉ backend do người dùng đặt, lưu bền qua AsyncStorage. API client đọc
 * apiBase()/webBase() ngay lúc gọi nên đổi cài đặt là có hiệu lực liền, không cần
 * build lại app.
 */
export interface Backend {
  host: string;
  apiPort: string;
  webPort: string;
}

const KEY = "rapphim.backend";

const DEFAULT: Backend = {
  host: DEFAULT_HOST,
  apiPort: DEFAULT_API_PORT,
  webPort: DEFAULT_WEB_PORT,
};

let current: Backend = { ...DEFAULT };
const listeners = new Set<() => void>();

/** Nạp cài đặt đã lưu khi khởi động app. Gọi một lần ở tầng gốc. */
export async function loadBackend(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      current = { ...DEFAULT, ...(JSON.parse(raw) as Partial<Backend>) };
    }
  } catch {
    // Đọc lỗi thì dùng mặc định.
  }
}

export function getBackend(): Backend {
  return current;
}

export function defaultBackend(): Backend {
  return { ...DEFAULT };
}

/** Lưu cài đặt mới và báo cho các màn đang lắng nghe nạp lại. */
export async function saveBackend(next: Backend): Promise<void> {
  current = {
    host: next.host.trim() || DEFAULT.host,
    apiPort: next.apiPort.trim() || DEFAULT.apiPort,
    webPort: next.webPort.trim() || DEFAULT.webPort,
  };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Ghi lỗi thì vẫn giữ trong bộ nhớ cho phiên hiện tại.
  }
  listeners.forEach((notify) => notify());
}

export function apiBase(): string {
  return `http://${current.host}:${current.apiPort}/api/v1`;
}

export function webBase(): string {
  return `http://${current.host}:${current.webPort}`;
}

/** Đăng ký nhận thông báo khi backend đổi (để màn tự nạp lại danh sách). */
export function onBackendChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
