/**
 * Premium 2 che do (chon bang LICENSE_API trong config):
 *
 * 1) CO LICENSE_API (khuyen dung): may chu license (Cloudflare Worker) la nguon su that.
 *    App goi /verify de kiem tra key -> nhan {ok, exp}. Luu han dung cuc bo de dung
 *    OFFLINE CO AN HAN; moi lan mo app (co mang) dong bo lai -> gia han thi cong them,
 *    thu hoi/het han thi CAT. Nho vay quan ly duoc key va cat dan theo thue bao.
 *
 * 2) TRONG LICENSE_API: che do offline thuan - ma da ky Ed25519, chung thuc bang khoa
 *    cong khai nhung san. Khong can may chu nhung KHONG thu hoi duoc.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import nacl from "tweetnacl";
import { useEffect, useState } from "react";

import { LICENSE_API, PREMIUM_PUBLIC_KEY } from "./config";

const STORE_KEY = "rapphim.premium";
const PREFIX = "RAPTV";

export interface License {
  tier: string;
  name?: string;
  exp?: number; // epoch giay; 0 hoac thieu = khong han
  key?: string; // giu lai de dong bo voi may chu
}

// --- base64 (ca url-safe) -> bytes, va doc UTF-8 ----------------------------
function b64ToBytes(input: string): Uint8Array {
  const s = input.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Int16Array(256).fill(-1);
  for (let i = 0; i < table.length; i++) lookup[table.charCodeAt(i)] = i;
  const len = padded.length;
  let outLen = (len / 4) * 3;
  if (padded[len - 1] === "=") outLen--;
  if (padded[len - 2] === "=") outLen--;
  const out = new Uint8Array(Math.max(0, outLen));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[padded.charCodeAt(i)];
    const b = lookup[padded.charCodeAt(i + 1)];
    const c = lookup[padded.charCodeAt(i + 2)];
    const d = lookup[padded.charCodeAt(i + 3)];
    if (a < 0 || b < 0) break;
    out[p++] = (a << 2) | (b >> 4);
    if (padded[i + 2] !== "=" && c >= 0) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (padded[i + 3] !== "=" && d >= 0) out[p++] = ((c & 3) << 6) | d;
  }
  return out;
}

function utf8(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c < 0x80) out += String.fromCharCode(c);
    else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (c < 0xf0)
      out += String.fromCharCode(
        ((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f),
      );
    else {
      const cp =
        ((c & 0x07) << 18) |
        ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) |
        (bytes[i++] & 0x3f);
      const off = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff));
    }
  }
  return out;
}

const PUB = b64ToBytes(PREMIUM_PUBLIC_KEY);

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
function validNow(exp?: number): boolean {
  return !exp || exp === 0 || nowSec() < exp;
}

/** Che do offline: chung thuc chu ky Ed25519 cua ma. */
export function verifyLicense(key: string): License | null {
  try {
    const parts = key.trim().split(".");
    if (parts.length !== 3 || parts[0] !== PREFIX) return null;
    const payload = b64ToBytes(parts[1]);
    const sig = b64ToBytes(parts[2]);
    if (sig.length !== 64) return null;
    if (!nacl.sign.detached.verify(payload, sig, PUB)) return null;
    const lic = JSON.parse(utf8(payload)) as License;
    if (lic.tier !== "premium" || !validNow(lic.exp)) return null;
    return lic;
  } catch {
    return null;
  }
}

/** Che do may chu: hoi Worker xem key con hieu luc khong. */
async function serverVerify(
  key: string,
): Promise<{ ok: boolean; name?: string; exp?: number; reachable: boolean }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${LICENSE_API.replace(/\/$/, "")}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, reachable: true };
    const data = (await res.json()) as { ok?: boolean; name?: string; exp?: number };
    return { ok: !!data.ok, name: data.name, exp: data.exp, reachable: true };
  } catch {
    return { ok: false, reachable: false }; // khong toi duoc may chu
  }
}

// --- trang thai + luu ben -----------------------------------------------------
let current: License | null = null;
const listeners = new Set<() => void>();

export function isPremium(): boolean {
  return current !== null;
}
export function currentLicense(): License | null {
  return current;
}

async function persist(lic: License): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(lic));
  } catch {
    // ghi loi thi van giu trong bo nho phien nay
  }
}
async function readCache(): Promise<License | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as License) : null;
  } catch {
    return null;
  }
}

/** Nap trang thai khi khoi dong; neu co may chu va co mang thi dong bo lai. */
export async function loadPremium(): Promise<void> {
  const cached = await readCache();
  if (!cached) {
    current = null;
    return;
  }
  // Tam thoi tin cache trong han (dung offline co an han).
  current = validNow(cached.exp) ? cached : null;

  if (LICENSE_API && cached.key) {
    const r = await serverVerify(cached.key);
    if (r.reachable) {
      if (r.ok && validNow(r.exp)) {
        current = { tier: "premium", name: r.name, exp: r.exp, key: cached.key };
        await persist(current);
      } else {
        // May chu bao het han / thu hoi -> CAT.
        current = null;
        try {
          await AsyncStorage.removeItem(STORE_KEY);
        } catch {
          /* bo qua */
        }
      }
    }
    // Khong toi duoc may chu: giu cache (an han) cho toi khi het han cuc bo.
  }
}

/** Kich hoat bang ma nguoi dung nhap. Tra ve License neu thanh cong, null neu sai. */
export async function activatePremium(key: string): Promise<License | null> {
  const k = key.trim();
  let lic: License | null = null;

  if (LICENSE_API) {
    const r = await serverVerify(k);
    if (r.ok && validNow(r.exp)) lic = { tier: "premium", name: r.name, exp: r.exp, key: k };
  } else {
    lic = verifyLicense(k);
    if (lic) lic.key = k;
  }

  if (lic) {
    current = lic;
    await persist(lic);
    listeners.forEach((f) => f());
  }
  return lic;
}

export async function clearPremium(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORE_KEY);
  } catch {
    /* bo qua */
  }
  current = null;
  listeners.forEach((f) => f());
}

export function onPremiumChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Hook phan ung: true/false, tu cap nhat khi trang thai Premium doi. */
export function usePremium(): boolean {
  const [p, setP] = useState(isPremium());
  useEffect(() => {
    setP(isPremium());
    return onPremiumChange(() => setP(isPremium()));
  }, []);
  return p;
}
