"use client";

import { useCallback } from "react";

import { useLocalStorage } from "@/lib/browser-store";

/**
 * Ho so nguoi dung, luu ngay trong trinh duyet.
 *
 * Ung dung khong co dang nhap nen day khong phai tai khoan that: chi la ten hien thi
 * va mau dai dien de giao dien bot vo danh. Moi trinh duyet la mot ho so rieng.
 */

const PROFILE_KEY = "rapphim.profile";

/** Mau dai dien de nguoi dung chon, dat theo bang mau san co cua giao dien. */
export const AVATAR_COLORS = [
  { id: "brand", label: "Đỏ", className: "bg-brand text-brand-fg" },
  { id: "blue", label: "Xanh dương", className: "bg-blue-600 text-white" },
  { id: "green", label: "Xanh lá", className: "bg-emerald-600 text-white" },
  { id: "purple", label: "Tím", className: "bg-violet-600 text-white" },
  { id: "amber", label: "Vàng", className: "bg-amber-500 text-black" },
  { id: "slate", label: "Xám", className: "bg-slate-600 text-white" },
] as const;

export type AvatarColorId = (typeof AVATAR_COLORS)[number]["id"];

export interface Profile {
  name: string;
  color: AvatarColorId;
  /** Lan dau mo ung dung tren trinh duyet nay. */
  createdAt: number;
}

const DEFAULT_PROFILE: Profile = {
  name: "Khách",
  color: "brand",
  createdAt: 0,
};

function parseProfile(value: unknown): Profile | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<Profile>;
  if (typeof raw.name !== "string") return null;

  const color = AVATAR_COLORS.some((item) => item.id === raw.color)
    ? (raw.color as AvatarColorId)
    : DEFAULT_PROFILE.color;

  return {
    name: raw.name,
    color,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
  };
}

/** Class mau ung voi lua chon, dung cho o dai dien. */
export function avatarClass(color: AvatarColorId): string {
  return AVATAR_COLORS.find((item) => item.id === color)?.className ?? AVATAR_COLORS[0].className;
}

/** Chu cai dau cua ten, dung lam noi dung o dai dien. */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "R";
}

export function useProfile() {
  const [profile, write] = useLocalStorage<Profile>(PROFILE_KEY, DEFAULT_PROFILE, parseProfile);

  const update = useCallback(
    (changes: Partial<Pick<Profile, "name" | "color">>) => {
      write((current) => ({
        ...current,
        ...changes,
        // Lan ghi dau tien cung la luc coi nhu ho so duoc tao.
        createdAt: current.createdAt || Date.now(),
      }));
    },
    [write],
  );

  const reset = useCallback(() => write(DEFAULT_PROFILE), [write]);

  return { profile, update, reset };
}
