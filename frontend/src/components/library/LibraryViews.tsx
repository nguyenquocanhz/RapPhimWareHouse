"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { MovieCard } from "@/components/movie/MovieCard";
import { TrashIcon } from "@/components/ui/icons";
import { relativeTime } from "@/lib/format";
import { toSummary, useFavorites, useWatchHistory } from "@/lib/library";

/**
 * Hai trang cua thu vien ca nhan. Du lieu nam trong localStorage nen ca hai
 * deu la client component; lan render dau tren server la danh sach rong,
 * sau khi hydrate moi co noi dung that.
 */

export function FavoritesView() {
  const { favorites, remove, clear } = useFavorites();

  return (
    <LibraryShell
      title="Phim đã lưu"
      count={favorites.length}
      onClear={favorites.length > 0 ? clear : undefined}
      clearLabel="Xoá tất cả phim đã lưu"
      empty={
        <EmptyLibrary
          title="Chưa lưu phim nào"
          description="Bấm dấu trang ở góc ảnh phim để lưu lại xem sau. Danh sách này chỉ nằm trên trình duyệt của bạn."
        />
      }
    >
      {favorites.map((entry) => (
        <MovieCard
          key={`${entry.provider}:${entry.slug}`}
          movie={toSummary(entry)}
          footnote={relativeTime(new Date(entry.savedAt).toISOString()) ?? undefined}
          action={
            <RemoveButton
              label={`Bỏ lưu ${entry.name}`}
              onClick={() => remove(entry.slug, entry.provider)}
            />
          }
        />
      ))}
    </LibraryShell>
  );
}

export function HistoryView() {
  const { history, remove, clear } = useWatchHistory();

  return (
    <LibraryShell
      title="Đang xem"
      count={history.length}
      onClear={history.length > 0 ? clear : undefined}
      clearLabel="Xoá lịch sử xem"
      empty={
        <EmptyLibrary
          title="Chưa có phim nào đang xem"
          description="Mở một bộ phim và bắt đầu xem, RapPhim sẽ nhớ tập bạn đang xem dở để lần sau mở lại đúng chỗ đó."
        />
      }
    >
      {history.map((entry) => (
        <MovieCard
          key={`${entry.provider}:${entry.slug}`}
          movie={toSummary(entry)}
          footnote={watchNote(entry.episodeName, entry.watchedAt)}
          action={
            <RemoveButton
              label={`Xoá ${entry.name} khỏi lịch sử`}
              onClick={() => remove(entry.slug, entry.provider)}
            />
          }
        />
      ))}
    </LibraryShell>
  );
}

function watchNote(episodeName: string | null, watchedAt: number): string {
  const when = relativeTime(new Date(watchedAt).toISOString());
  const episode = episodeName ? `Đang xem ${episodeName}` : "Đang xem";
  return when ? `${episode} • ${when}` : episode;
}

function LibraryShell({
  title,
  count,
  onClear,
  clearLabel,
  empty,
  children,
}: {
  title: string;
  count: number;
  onClear?: () => void;
  clearLabel: string;
  empty: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            {count > 0 ? `${count} phim • lưu trên trình duyệt này` : "Lưu trên trình duyệt này"}
          </p>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
          >
            <TrashIcon width={18} height={18} />
            Xoá tất cả
          </button>
        )}
      </div>

      {count === 0 ? (
        empty
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
          {children}
        </div>
      )}
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
    >
      <TrashIcon width={18} height={18} />
    </button>
  );
}

function EmptyLibrary({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-surface px-6 py-16 text-center">
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
