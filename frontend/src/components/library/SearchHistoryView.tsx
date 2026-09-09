"use client";

import Link from "next/link";
import { useState } from "react";

import { CloseIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import { relativeTime } from "@/lib/format";
import { useRecentSearches } from "@/lib/library";

/**
 * Trang lich su tim kiem: xem lai, tim lai va xoa tung tu khoa.
 *
 * O goi y duoi thanh tim kiem chi hien vai muc dau; trang nay cho xem
 * toan bo va co o loc de tim nhanh trong chinh lich su.
 */
export function SearchHistoryView() {
  const { searches, remove, clear } = useRecentSearches();
  const [filter, setFilter] = useState("");

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? searches.filter((entry) => entry.keyword.toLowerCase().includes(needle))
    : searches;

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg sm:text-2xl">Lịch sử tìm kiếm</h1>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            {searches.length > 0
              ? `${searches.length} từ khoá • lưu trên trình duyệt này`
              : "Lưu trên trình duyệt này"}
          </p>
        </div>

        {searches.length > 0 && (
          <button
            type="button"
            onClick={clear}
            aria-label="Xoá toàn bộ lịch sử tìm kiếm"
            className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
          >
            <TrashIcon width={18} height={18} />
            Xoá tất cả
          </button>
        )}
      </div>

      {searches.length === 0 ? (
        <EmptyHistory />
      ) : (
        <>
          {/* O loc chi hoat dong trong lich su, khong goi ra API. */}
          <div className="mb-4 flex h-10 max-w-md items-center rounded-full border border-border bg-canvas focus-within:border-blue-500">
            <SearchIcon width={20} height={20} className="ml-3 shrink-0 text-muted" />
            <input
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Lọc trong lịch sử"
              aria-label="Lọc trong lịch sử tìm kiếm"
              className="h-full w-full min-w-0 bg-transparent px-3 text-sm text-fg outline-none placeholder:text-muted"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                aria-label="Xoá bộ lọc"
                className="mr-2 grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
              >
                <CloseIcon width={16} height={16} />
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl bg-surface px-6 py-8 text-sm text-muted">
              Không có từ khoá nào khớp &ldquo;{filter}&rdquo;.
            </p>
          ) : (
            <ul className="max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
              {visible.map((entry) => (
                <li key={entry.keyword} className="flex items-center gap-2 bg-canvas pr-2">
                  <Link
                    href={`/tim-kiem?keyword=${encodeURIComponent(entry.keyword)}`}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm transition hover:bg-surface-hover"
                  >
                    <SearchIcon width={18} height={18} className="shrink-0 text-muted" />
                    <span className="truncate text-fg">{entry.keyword}</span>
                    {entry.at > 0 && (
                      <span className="ml-auto shrink-0 pl-3 text-xs text-muted">
                        {relativeTime(new Date(entry.at).toISOString())}
                      </span>
                    )}
                  </Link>

                  <button
                    type="button"
                    onClick={() => remove(entry.keyword)}
                    aria-label={`Xoá từ khoá ${entry.keyword}`}
                    title="Xoá khỏi lịch sử"
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
                  >
                    <CloseIcon width={18} height={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-surface px-6 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-surface-hover text-muted">
        <SearchIcon width={28} height={28} />
      </span>
      <h2 className="text-lg font-medium text-fg">Chưa có từ khoá nào</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        Các từ khoá bạn tìm sẽ được ghi lại ở đây và gợi ý sẵn dưới ô tìm kiếm. Danh sách
        này chỉ nằm trên trình duyệt của bạn.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-chip-active px-4 py-2 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
      >
        Khám phá phim mới
      </Link>
    </div>
  );
}
