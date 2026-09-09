"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Doc trang thai cua trinh duyet (localStorage) trong Server Components app.
 *
 * Hai co che ghep lai:
 * - `useSyncExternalStore` lo phan phan ung: mot the phim bam luu thi so dem tren
 *   sidebar doi ngay, khong phai tai lai trang.
 * - `useHydrated` lo phan an toan khi hydrate: lan render dau tren client phai
 *   giong het HTML tu server, chi tu lan render thu hai moi duoc dung du lieu that.
 */

const listeners = new Map<string, Set<() => void>>();

/** Bo dem gia tri tho, de getSnapshot tra ve cung mot tham chieu giua cac lan render. */
const cache = new Map<string, string | null>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function readRaw(key: string): string | null {
  if (!cache.has(key)) {
    try {
      cache.set(key, window.localStorage.getItem(key));
    } catch {
      // Trinh duyet chan luu tru (che do rieng tu, chan cookie) - coi nhu chua co gia tri.
      cache.set(key, null);
    }
  }
  return cache.get(key) ?? null;
}

function decode<T>(raw: string | null, fallback: T, parse: (raw: unknown) => T | null): T {
  if (raw === null) return fallback;
  try {
    return parse(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * False o lan render dau tien tren client (trung voi HTML tu server), true tu lan sau.
 *
 * Day la cach duy nhat dang tin cay de biet "da hydrate xong". Khong dung
 * `getServerSnapshot` cua useSyncExternalStore cho viec nay duoc: luc hydrate React
 * *render* bang getServerSnapshot nhung lai *ghi nho* ket qua cua getSnapshot, nen
 * no khong thay co thay doi va khong bao gio render lai - man hinh ket o trang thai
 * rong du localStorage co du lieu.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Day dung la truong hop can setState sau khi mount: gia tri chi ton tai o
    // phia trinh duyet nen khong the biet no ngay tu lan render dau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return hydrated;
}

/**
 * Doc va ghi mot gia tri JSON trong localStorage.
 *
 * Ham ghi nhan ca gia tri moi lan ham cap nhat `(prev) => next`. Dang ham cap nhat
 * quan trong o cho: no khong phu thuoc gia tri hien tai nen tham chieu cua ham ghi
 * on dinh qua moi lan render, dat vao mang phu thuoc cua useEffect duoc ma khong lap.
 *
 * @param key         khoa trong localStorage
 * @param serverValue gia tri dung khi render tren server va o lan render dau tien
 * @param parse       ham doc gia tri da luu, tra ve null neu du lieu khong hop le
 */
export function useLocalStorage<T>(
  key: string,
  serverValue: T,
  parse: (raw: unknown) => T | null,
): readonly [T, (next: T | ((previous: T) => T)) => void] {
  const hydrated = useHydrated();

  const subscribe = useCallback(
    (onChange: () => void) => {
      let group = listeners.get(key);
      if (!group) {
        group = new Set();
        listeners.set(key, group);
      }
      group.add(onChange);
      return () => {
        group.delete(onChange);
      };
    },
    [key],
  );

  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const value = hydrated ? decode(raw, serverValue, parse) : serverValue;

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (previous: T) => T)(decode(readRaw(key), serverValue, parse))
          : next;

      const serialized = JSON.stringify(resolved);
      cache.set(key, serialized);
      try {
        window.localStorage.setItem(key, serialized);
      } catch {
        // Khong ghi duoc thi chi mat tinh nang ghi nho, giao dien van chay.
      }
      notify(key);
    },
    [key, serverValue, parse],
  );

  return [value, setValue] as const;
}
