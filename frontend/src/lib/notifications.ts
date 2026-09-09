"use client";

import { useCallback } from "react";

import { useLocalStorage } from "@/lib/browser-store";
import type { FavoriteEntry, HistoryEntry, MovieSnapshot } from "@/lib/library";
import type { MovieSummary, ProviderCode } from "@/lib/types";

/**
 * Thong bao phim moi.
 *
 * Ung dung khong co tai khoan nen khong the day thong bao tu server. Thay vao do,
 * thu vien trong trinh duyet giu ban chup cua tung phim tai thoi diem luu; trang
 * thong bao hoi backend trang thai hien tai roi so hai ban voi nhau. Phim nao doi
 * tap thi thanh mot thong bao.
 */

const NOTIFICATIONS_KEY = "rapphim.notifications";

export interface NotificationItem {
  slug: string;
  provider: ProviderCode;
  name: string;
  thumbUrl: string | null;
  posterUrl: string | null;
  /** Tap luc luu vao thu vien. */
  from: string | null;
  /** Tap moi nhat hien co. */
  to: string | null;
  /** Thoi diem nguon cap nhat, dung de biet thong bao nao chua doc. */
  modifiedAt: string | null;
  /** Nguoi dung dang xem toi tap nao, chi co voi phim trong muc "dang xem". */
  watchingEpisode: string | null;
}

interface NotificationState {
  /** Lan cuoi bam "danh dau da doc". */
  lastSeenAt: number;
  /** Lan cuoi doi chieu voi backend. */
  checkedAt: number;
  items: NotificationItem[];
}

const EMPTY_STATE: NotificationState = { lastSeenAt: 0, checkedAt: 0, items: [] };

function parseState(value: unknown): NotificationState | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Partial<NotificationState>;
  if (!Array.isArray(raw.items)) return null;

  return {
    lastSeenAt: typeof raw.lastSeenAt === "number" ? raw.lastSeenAt : 0,
    checkedAt: typeof raw.checkedAt === "number" ? raw.checkedAt : 0,
    items: raw.items.filter(
      (item): item is NotificationItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as NotificationItem).slug === "string",
    ),
  };
}

/** Mot thong bao la chua doc khi nguon cap nhat sau lan danh dau gan nhat. */
export function isUnread(item: NotificationItem, lastSeenAt: number): boolean {
  if (!item.modifiedAt) return lastSeenAt === 0;
  const time = Date.parse(item.modifiedAt);
  return Number.isFinite(time) ? time > lastSeenAt : false;
}

/**
 * So sanh ban chup trong thu vien voi trang thai hien tai de tim phim co tap moi.
 *
 * @param library  phim dang theo doi, kem tap ghi nhan luc luu
 * @param current  trang thai moi nhat lay tu backend
 * @param watching tap dang xem do dang cua tung phim, neu co
 */
export function diffLibrary(
  library: MovieSnapshot[],
  current: MovieSummary[],
  watching: Map<string, string | null>,
): NotificationItem[] {
  const currentByKey = new Map(current.map((movie) => [key(movie.provider, movie.slug), movie]));

  return library
    .map((snapshot): NotificationItem | null => {
      const latest = currentByKey.get(key(snapshot.provider, snapshot.slug));
      if (!latest) return null;

      // Chi bao khi so tap thay doi. Nguon cap nhat vi ly do khac thi bo qua.
      if (!latest.episodeCurrent || latest.episodeCurrent === snapshot.episodeCurrent) {
        return null;
      }

      return {
        slug: snapshot.slug,
        provider: snapshot.provider,
        name: latest.name || snapshot.name,
        thumbUrl: latest.thumbUrl ?? snapshot.thumbUrl,
        posterUrl: latest.posterUrl ?? snapshot.posterUrl,
        from: snapshot.episodeCurrent,
        to: latest.episodeCurrent,
        modifiedAt: latest.modifiedAt,
        watchingEpisode: watching.get(key(snapshot.provider, snapshot.slug)) ?? null,
      };
    })
    .filter((item): item is NotificationItem => item !== null)
    .sort((a, b) => Date.parse(b.modifiedAt ?? "0") - Date.parse(a.modifiedAt ?? "0"));
}

/** Gop phim da luu va phim dang xem thanh mot danh sach theo doi, khong trung. */
export function libraryOf(
  favorites: FavoriteEntry[],
  history: HistoryEntry[],
): { snapshots: MovieSnapshot[]; watching: Map<string, string | null> } {
  const snapshots = new Map<string, MovieSnapshot>();
  const watching = new Map<string, string | null>();

  for (const entry of history) {
    const id = key(entry.provider, entry.slug);
    snapshots.set(id, entry);
    watching.set(id, entry.episodeName);
  }
  for (const entry of favorites) {
    const id = key(entry.provider, entry.slug);
    if (!snapshots.has(id)) {
      snapshots.set(id, entry);
    }
  }

  return { snapshots: [...snapshots.values()], watching };
}

function key(provider: string, slug: string): string {
  return `${provider}:${slug}`;
}

export function useNotifications() {
  const [state, write] = useLocalStorage<NotificationState>(
    NOTIFICATIONS_KEY,
    EMPTY_STATE,
    parseState,
  );

  /** Ghi lai ket qua doi chieu vua chay, giu nguyen moc da doc. */
  const save = useCallback(
    (items: NotificationItem[]) => {
      write((current) => ({ ...current, items, checkedAt: Date.now() }));
    },
    [write],
  );

  /**
   * Danh dau moi thong bao dang hien la da doc.
   *
   * Khong dung thang {@code Date.now()}: nguon co the bao thoi diem cap nhat som hon
   * dong ho may (lech dong ho hoac mui gio phia nguon - KKPhim tung lech vai tieng).
   * Khi do moc "da doc" van nho hon thoi diem cua thong bao va no khong bao gio het
   * chua doc. Lay moc lon hon giua hai gia tri de chac chan.
   */
  const markAllSeen = useCallback(() => {
    write((current) => {
      const newest = current.items.reduce((max, item) => {
        const time = item.modifiedAt ? Date.parse(item.modifiedAt) : 0;
        return Number.isFinite(time) && time > max ? time : max;
      }, 0);

      return { ...current, lastSeenAt: Math.max(Date.now(), newest) };
    });
  }, [write]);

  const unreadCount = state.items.filter((item) => isUnread(item, state.lastSeenAt)).length;

  return { ...state, unreadCount, save, markAllSeen };
}
