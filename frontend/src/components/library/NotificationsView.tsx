"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Thumb } from "@/components/movie/Thumb";
import { BellIcon, CheckIcon, PlayIcon } from "@/components/ui/icons";
import { relativeTime } from "@/lib/format";
import { useFavorites, useWatchHistory } from "@/lib/library";
import {
  diffLibrary,
  isUnread,
  libraryOf,
  useNotifications,
  type NotificationItem,
} from "@/lib/notifications";
import type { MovieSummary, ProviderCode } from "@/lib/types";

/** Backend chan 30 slug moi lan goi. */
const BATCH_LIMIT = 30;

type Status = "loading" | "ready" | "error";

/** Ket qua doi chieu, gan voi thu vien tai thoi diem chay. */
interface Result {
  key: string;
  status: "ready" | "error";
  error?: string;
}

/**
 * Trang thong bao: doi chieu thu vien trong trinh duyet voi trang thai hien tai
 * cua nguon de tim phim da co tap moi.
 *
 * Viec doi chieu chay moi lan mo trang. Ket qua duoc luu lai de chuong tren
 * thanh dieu huong biet co bao nhieu thong bao chua doc ma khong phai goi lai.
 */
export function NotificationsView() {
  const { favorites } = useFavorites();
  const { history } = useWatchHistory();
  const { items, lastSeenAt, checkedAt, save, markAllSeen } = useNotifications();

  // Ket qua gan voi chinh thu vien da doi chieu. Trang thai "dang tai" duoc suy ra
  // tu viec ket qua chua khop thu vien hien tai, khong luu thanh state rieng -
  // nho vay effect ben duoi khong phai goi setState ngay trong than ham.
  const [result, setResult] = useState<Result | null>(null);

  const { snapshots, watching } = useMemo(
    () => libraryOf(favorites, history),
    [favorites, history],
  );

  // Chuoi on dinh cua thu vien: chi doi chieu lai khi danh sach theo doi thay doi,
  // khong chay lai moi lan mang favorites/history duoc dung lai khi render.
  const libraryKey = useMemo(
    () =>
      snapshots
        .map((entry) => `${entry.provider}:${entry.slug}`)
        .sort()
        .join(","),
    [snapshots],
  );

  useEffect(() => {
    if (!libraryKey) return;

    let cancelled = false;

    async function check() {
      try {
        const current = await fetchCurrent(snapshots);
        if (cancelled) return;
        save(diffLibrary(snapshots, current, watching));
        setResult({ key: libraryKey, status: "ready" });
      } catch (cause) {
        if (cancelled) return;
        setResult({
          key: libraryKey,
          status: "error",
          error: cause instanceof Error ? cause.message : "Không kiểm tra được cập nhật.",
        });
      }
    }

    check();
    return () => {
      cancelled = true;
    };
    // snapshots/watching duoc dung lai theo libraryKey nen khong can dat vao day.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryKey]);

  const status: Status = !libraryKey
    ? "ready"
    : result?.key === libraryKey
      ? result.status
      : "loading";
  const error = result?.key === libraryKey ? result.error : undefined;

  const unread = items.filter((item) => isUnread(item, lastSeenAt)).length;

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg sm:text-2xl">Thông báo</h1>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            {describe(status, snapshots.length, checkedAt)}
          </p>
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={markAllSeen}
            className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
          >
            <CheckIcon width={18} height={18} />
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {status === "error" && (
        <p className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          {error}
        </p>
      )}

      {snapshots.length === 0 ? (
        <EmptyState
          title="Chưa theo dõi phim nào"
          description="Lưu phim hoặc bắt đầu xem một bộ phim, RapPhim sẽ báo cho bạn khi phim đó có tập mới."
        />
      ) : status === "loading" && items.length === 0 ? (
        <NotificationSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có tập mới"
          description={`Đang theo dõi ${snapshots.length} phim. Khi một trong số đó có tập mới, thông báo sẽ hiện ở đây.`}
        />
      ) : (
        <ul className="max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
          {items.map((item) => (
            <li key={`${item.provider}:${item.slug}`}>
              <NotificationRow item={item} unread={isUnread(item, lastSeenAt)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({ item, unread }: { item: NotificationItem; unread: boolean }) {
  const href =
    item.provider === "kkphim"
      ? `/phim/${item.slug}`
      : `/phim/${item.slug}?provider=${item.provider}`;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-3 transition hover:bg-surface-hover ${
        unread ? "bg-surface" : "bg-canvas"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${unread ? "bg-brand" : "bg-transparent"}`}
      />

      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-surface sm:w-32">
        <Thumb src={item.thumbUrl ?? item.posterUrl} alt={item.name} sizes="128px" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2-title text-sm font-medium leading-5 text-fg">{item.name}</p>
        <p className="mt-1 text-sm text-muted">
          Có <span className="text-fg">{item.to}</span>
          {item.from ? ` (trước đó ${item.from})` : ""}
        </p>
        {item.watchingEpisode && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <PlayIcon width={14} height={14} />
            Bạn đang xem {item.watchingEpisode}
          </p>
        )}
      </div>

      {item.modifiedAt && (
        <span className="shrink-0 self-start pt-1 text-xs text-muted">
          {relativeTime(item.modifiedAt)}
        </span>
      )}
    </Link>
  );
}

/**
 * Goi backend qua route handler cung goc. Thu vien co the tron phim tu hai nguon
 * nen goi rieng cho tung nguon, va cat bot neu vuot han muc cua backend.
 */
async function fetchCurrent(
  snapshots: Array<{ slug: string; provider: ProviderCode }>,
): Promise<MovieSummary[]> {
  const byProvider = new Map<ProviderCode, string[]>();
  for (const entry of snapshots) {
    const slugs = byProvider.get(entry.provider) ?? [];
    if (slugs.length < BATCH_LIMIT) {
      slugs.push(entry.slug);
    }
    byProvider.set(entry.provider, slugs);
  }

  const responses = await Promise.all(
    [...byProvider.entries()].map(async ([provider, slugs]) => {
      const url = `/api/updates?slugs=${encodeURIComponent(slugs.join(","))}&provider=${provider}`;
      const response = await fetch(url);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Không kiểm tra được cập nhật.");
      }
      const body = (await response.json()) as { items: MovieSummary[] };
      return body.items;
    }),
  );

  return responses.flat();
}

function describe(status: Status, following: number, checkedAt: number): string {
  if (status === "loading") return "Đang kiểm tra cập nhật…";
  if (following === 0) return "Theo dõi phim để nhận thông báo";

  const when = checkedAt ? relativeTime(new Date(checkedAt).toISOString()) : null;
  const base = `Đang theo dõi ${following} phim`;
  return when ? `${base} • kiểm tra ${when}` : base;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-surface px-6 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-surface-hover text-muted">
        <BellIcon width={28} height={28} />
      </span>
      <h2 className="text-lg font-medium text-fg">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-chip-active px-4 py-2 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
      >
        Khám phá phim mới
      </Link>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <ul className="max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-3">
          <span className="size-2 shrink-0" />
          <div className="skeleton aspect-video w-28 shrink-0 rounded-lg sm:w-32" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/5 rounded" />
            <div className="skeleton h-3 w-2/5 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}
