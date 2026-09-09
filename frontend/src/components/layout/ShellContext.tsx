"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useLocalStorage } from "@/lib/browser-store";

export type Theme = "dark" | "light";

/**
 * "auto" nghia la chua ai bam nut menu, de CSS quyet dinh theo be ngang man hinh.
 * Nho vay HTML render tren server dung cho moi kich thuoc, khong bi nhay sidebar
 * khi hydrate. Chi khi nguoi dung bam nut moi chuyen sang "open" / "closed".
 */
export type SidebarState = "auto" | "open" | "closed";

interface ShellState {
  sidebarState: SidebarState;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ShellContext = createContext<ShellState | null>(null);

export const THEME_KEY = "rapphim.theme";

/** Tu 1280px tro len sidebar mo rong van con du cho cho luoi phim. */
const WIDE_QUERY = "(min-width: 1280px)";

function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_KEY, "dark", parseTheme);
  const [sidebarState, setSidebarState] = useState<SidebarState>("auto");

  // Dong bo lua chon giao dien voi the <html>. Script trong <head> da dat class
  // nay truoc khung hinh dau tien, day chi lo cac lan doi sau do.
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const toggleSidebar = useCallback(() => {
    setSidebarState((current) => {
      if (current !== "auto") {
        return current === "open" ? "closed" : "open";
      }
      // Lan bam dau tien: dao nguoc trang thai mac dinh cua kich thuoc hien tai.
      // Doc media query trong handler nen khong anh huong toi lan render tren server.
      return window.matchMedia(WIDE_QUERY).matches ? "closed" : "open";
    });
  }, []);

  const closeSidebar = useCallback(() => setSidebarState("closed"), []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const value = useMemo(
    () => ({ sidebarState, toggleSidebar, closeSidebar, theme, toggleTheme, setTheme }),
    [sidebarState, toggleSidebar, closeSidebar, theme, toggleTheme, setTheme],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell phải được dùng bên trong <ShellProvider>");
  }
  return context;
}
