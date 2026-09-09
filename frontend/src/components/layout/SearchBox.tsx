"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { CloseIcon, HistoryIcon, SearchIcon } from "@/components/ui/icons";
import { useRecentSearches } from "@/lib/library";

/** So goi y toi da hien duoi o tim kiem. */
const SUGGESTION_LIMIT = 8;

interface SearchBoxProps {
  /** Tu khoa dang co tren URL. Masthead dat lam `key` nen doi URL la o nhap tu nap lai. */
  initialKeyword: string;
  /** Goi sau khi gui tim kiem, dung de dong lop tim kiem tren mobile. */
  onSubmitted?: () => void;
  autoFocus?: boolean;
}

/**
 * O tim kiem kem goi y tu khoa vua tim. Bam `/` hoac Ctrl+K o bat ky dau
 * cung nhay con tro vao day, giong thoi quen tren YouTube.
 */
export function SearchBox({ initialKeyword, onSubmitted, autoFocus = false }: SearchBoxProps) {
  const router = useRouter();
  const { searches, push, remove } = useRecentSearches();

  const [value, setValue] = useState(initialKeyword);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Phim tat: "/" khi khong go chu, hoac Ctrl+K / Cmd+K o bat ky dau.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      const slash = event.key === "/" && !typing;
      const commandK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (slash || commandK) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const query = value.trim().toLowerCase();
  // Lich su luu toi 30 muc, nhung o goi y chi hien vai muc dau cho gon.
  const suggestions = (
    query
      ? searches.filter(
          (item) =>
            item.keyword.toLowerCase().includes(query) && item.keyword.toLowerCase() !== query,
        )
      : searches
  ).slice(0, SUGGESTION_LIMIT);

  function go(keyword: string) {
    const target = keyword.trim();
    if (!target) return;
    push(target);
    setOpen(false);
    onSubmitted?.();
    router.push(`/tim-kiem?keyword=${encodeURIComponent(target)}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(value);
  }

  return (
    <div
      className="relative w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <form onSubmit={submit} role="search" className="flex items-center">
        <div className="flex h-10 flex-1 items-center rounded-full border border-border bg-canvas focus-within:border-blue-500">
          <input
            ref={inputRef}
            type="text"
            name="keyword"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="Tìm kiếm phim"
            aria-label="Tìm kiếm phim"
            autoComplete="off"
            className="h-full w-full min-w-0 rounded-l-full bg-transparent px-4 text-base text-fg outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            aria-label="Tìm kiếm"
            className="grid h-full w-16 shrink-0 place-items-center rounded-r-full border-l border-border bg-surface text-fg transition hover:bg-surface-hover"
          >
            <SearchIcon width={22} height={22} />
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-canvas py-2 shadow-xl">
          <div className="flex items-center justify-between gap-2 px-4 pb-1">
            <p className="text-xs text-muted">Tìm kiếm gần đây</p>
            <Link
              href="/lich-su-tim-kiem"
              onClick={() => setOpen(false)}
              className="text-xs text-muted transition hover:text-fg"
            >
              Xem tất cả
            </Link>
          </div>
          <ul>
            {suggestions.map((entry) => (
              <li key={entry.keyword} className="flex items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={() => go(entry.keyword)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-fg transition hover:bg-surface-hover"
                >
                  <HistoryIcon width={18} height={18} className="shrink-0 text-muted" />
                  <span className="truncate">{entry.keyword}</span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(entry.keyword)}
                  aria-label={`Xoá từ khoá ${entry.keyword}`}
                  title="Xoá khỏi lịch sử tìm kiếm"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
                >
                  <CloseIcon width={16} height={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
