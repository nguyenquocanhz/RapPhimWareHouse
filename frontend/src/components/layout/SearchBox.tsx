"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { CloseIcon, FilmIcon, HistoryIcon, SearchIcon, TagIcon } from "@/components/ui/icons";
import { thumbOf } from "@/lib/format";
import { useRecentSearches } from "@/lib/library";
import type { ProviderCode, Taxonomy } from "@/lib/types";

/** Gioi han moi nhom cho dropdown gon. */
const MAX_GENRES = 4;
const MAX_MOVIES = 6;
const MAX_RECENT = 6;

/** Cho go xong moi goi de khong ban API moi phim. */
const DEBOUNCE_MS = 250;

/** Phim rut gon do /api/suggest tra ve. */
interface SuggestMovie {
  slug: string;
  name: string;
  year: number | null;
  thumbUrl: string | null;
  posterUrl: string | null;
  provider: ProviderCode;
}

interface SuggestData {
  genres: Taxonomy[];
  movies: SuggestMovie[];
}

const EMPTY: SuggestData = { genres: [], movies: [] };

interface SearchBoxProps {
  /** Tu khoa dang co tren URL. Masthead dat lam `key` nen doi URL la o nhap tu nap lai. */
  initialKeyword: string;
  /** Goi sau khi gui tim kiem, dung de dong lop tim kiem tren mobile. */
  onSubmitted?: () => void;
  autoFocus?: boolean;
}

/** Mot dong co the chon trong dropdown, xep phang de di bang phim mui ten. */
type Entry =
  | { kind: "genre"; genre: Taxonomy }
  | { kind: "movie"; movie: SuggestMovie }
  | { kind: "recent"; keyword: string };

function movieHref(movie: SuggestMovie): string {
  return movie.provider && movie.provider !== "kkphim"
    ? `/phim/${movie.slug}?provider=${movie.provider}`
    : `/phim/${movie.slug}`;
}

/**
 * O tim kiem kem goi y giong YouTube: vua go vua hien phim khop ten va the loai
 * khop, chia thanh nhom, cong voi lich su tim kiem. Bam `/` hoac Ctrl+K o bat ky
 * dau cung nhay con tro vao day.
 */
export function SearchBox({ initialKeyword, onSubmitted, autoFocus = false }: SearchBoxProps) {
  const router = useRouter();
  const { searches, push, remove } = useRecentSearches();

  const [value, setValue] = useState(initialKeyword);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SuggestData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = value.trim();

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Phim tat: "/" khi khong go chu, hoac Ctrl+K / Cmd+K o bat ky dau.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
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

  // Goi y live tu may chu, co debounce va huy request cu khi go tiep.
  useEffect(() => {
    if (!open || query.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/suggest?keyword=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : EMPTY))
        .then((body: SuggestData) => {
          if (controller.signal.aborted) return;
          setData({ genres: body.genres ?? [], movies: body.movies ?? [] });
          setLoading(false);
        })
        .catch(() => {
          // Goi y hong thi lang le bo qua, o tim kiem van dung binh thuong.
          if (!controller.signal.aborted) {
            setData(EMPTY);
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  // Lich su khop tu khoa dang go (khi rong thi hien lich su gan nhat).
  const recent = useMemo(() => {
    const needle = query.toLowerCase();
    const matched = needle
      ? searches.filter(
          (item) =>
            item.keyword.toLowerCase().includes(needle) && item.keyword.toLowerCase() !== needle,
        )
      : searches;
    return matched.slice(0, MAX_RECENT).map((item) => item.keyword);
  }, [searches, query]);

  const liveGenres = useMemo(
    () => (query.length >= 2 ? data.genres.slice(0, MAX_GENRES) : []),
    [data.genres, query],
  );
  const liveMovies = useMemo(
    () => (query.length >= 2 ? data.movies.slice(0, MAX_MOVIES) : []),
    [data.movies, query],
  );

  // Danh sach phang theo dung thu tu hien thi, de phim mui ten di qua tung dong.
  const entries = useMemo<Entry[]>(
    () => [
      ...liveGenres.map((genre): Entry => ({ kind: "genre", genre })),
      ...liveMovies.map((movie): Entry => ({ kind: "movie", movie })),
      ...recent.map((keyword): Entry => ({ kind: "recent", keyword })),
    ],
    [liveGenres, liveMovies, recent],
  );

  const go = useCallback(
    (keyword: string) => {
      const target = keyword.trim();
      if (!target) return;
      push(target);
      setOpen(false);
      onSubmitted?.();
      router.push(`/tim-kiem?keyword=${encodeURIComponent(target)}`);
    },
    [push, onSubmitted, router],
  );

  const select = useCallback(
    (entry: Entry) => {
      setOpen(false);
      onSubmitted?.();
      if (entry.kind === "genre") {
        router.push(`/the-loai/${entry.genre.slug}`);
      } else if (entry.kind === "movie") {
        router.push(movieHref(entry.movie));
      } else {
        go(entry.keyword);
      }
    },
    [router, onSubmitted, go],
  );

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && entries.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(current + 1, entries.length - 1));
    } else if (event.key === "ArrowUp" && entries.length > 0) {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, -1));
    } else if (event.key === "Enter" && active >= 0 && active < entries.length) {
      // Dang chon mot goi y thi di theo no, dung gui form tu khoa tho.
      event.preventDefault();
      select(entries[active]);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(value);
  }

  const showDropdown = open && (entries.length > 0 || (loading && query.length >= 2));
  // Chi so phang de khop `active`: the loai truoc, roi phim, roi lich su.
  const movieOffset = liveGenres.length;
  const recentOffset = liveGenres.length + liveMovies.length;

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
              setActive(-1);
              setOpen(true);
              if (event.target.value.trim().length < 2) {
                setData(EMPTY);
              }
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
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

      {showDropdown && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-canvas py-2 shadow-xl">
          {liveGenres.length > 0 && (
            <Section title="Thể loại">
              {liveGenres.map((genre, i) => {
                const rowIndex = i;
                return (
                  <Row
                    key={`g-${genre.slug}`}
                    active={rowIndex === active}
                    onMouseEnter={() => setActive(rowIndex)}
                    onClick={() => select({ kind: "genre", genre })}
                  >
                    <TagIcon width={18} height={18} className="shrink-0 text-muted" />
                    <span className="truncate">{genre.name}</span>
                  </Row>
                );
              })}
            </Section>
          )}

          {liveMovies.length > 0 && (
            <Section title="Phim">
              {liveMovies.map((movie, i) => {
                const rowIndex = movieOffset + i;
                const thumb = thumbOf(movie);
                return (
                  <Row
                    key={`m-${movie.provider}-${movie.slug}`}
                    active={rowIndex === active}
                    onMouseEnter={() => setActive(rowIndex)}
                    onClick={() => select({ kind: "movie", movie })}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="h-12 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="grid h-12 w-9 shrink-0 place-items-center rounded bg-surface text-muted">
                        <FilmIcon width={16} height={16} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-fg">{movie.name}</span>
                      {movie.year && <span className="block text-xs text-muted">{movie.year}</span>}
                    </span>
                  </Row>
                );
              })}
            </Section>
          )}

          {recent.length > 0 && (
            <Section
              title="Tìm kiếm gần đây"
              action={
                <Link
                  href="/lich-su-tim-kiem"
                  onClick={() => setOpen(false)}
                  className="text-xs text-muted transition hover:text-fg"
                >
                  Xem tất cả
                </Link>
              }
            >
              {recent.map((keyword, i) => {
                const rowIndex = recentOffset + i;
                return (
                  <div key={`r-${keyword}`} className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      onMouseEnter={() => setActive(rowIndex)}
                      onClick={() => select({ kind: "recent", keyword })}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition ${
                        rowIndex === active ? "bg-surface-hover text-fg" : "text-fg"
                      }`}
                    >
                      <HistoryIcon width={18} height={18} className="shrink-0 text-muted" />
                      <span className="truncate">{keyword}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(keyword)}
                      aria-label={`Xoá từ khoá ${keyword}`}
                      title="Xoá khỏi lịch sử tìm kiếm"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
                    >
                      <CloseIcon width={16} height={16} />
                    </button>
                  </div>
                );
              })}
            </Section>
          )}

          {loading && entries.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">Đang tìm…</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pb-1">
      <div className="flex items-center justify-between gap-2 px-4 py-1">
        <p className="text-xs font-medium text-muted">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  active,
  onMouseEnter,
  onClick,
  children,
}: {
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex w-full min-w-0 items-center gap-3 px-4 py-2 text-left text-sm transition ${
        active ? "bg-surface-hover text-fg" : "text-fg hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}
