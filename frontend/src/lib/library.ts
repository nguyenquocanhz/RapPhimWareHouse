"use client";

import { useCallback } from "react";

import { useLocalStorage } from "@/lib/browser-store";
import type { MovieDetail, MovieSummary, ProviderCode, TmdbRef } from "@/lib/types";

/**
 * Thu vien ca nhan luu ngay trong trinh duyet: phim da luu va phim dang xem do dang.
 *
 * Ung dung chua co dang nhap nen khong co cach nao gan du lieu nay voi mot tai khoan.
 * Vi vay thu vien nam trong localStorage: rieng tu, khong can server, nhung chi
 * ton tai tren dung trinh duyet do. Muon dong bo nhieu may thi phai them dang nhap
 * va mot noi luu tru phia backend.
 */

const FAVORITES_KEY = "rapphim.favorites";
const HISTORY_KEY = "rapphim.history";
const SEARCHES_KEY = "rapphim.searches";
const POSITIONS_KEY = "rapphim.positions";
const INTRO_KEY = "rapphim.intro";
const CHAPTERS_KEY = "rapphim.chapters";

/** Gioi han so muc de localStorage khong phinh to theo thoi gian. */
const MAX_FAVORITES = 200;
const MAX_HISTORY = 30;
const MAX_SEARCHES = 30;
const MAX_CHAPTERS = 50;

/**
 * Anh chup gon cua mot phim - du de dung lai the phim ma khong phai goi lai API.
 * Bo qua the loai / quoc gia vi the phim khong hien chung.
 */
export interface MovieSnapshot {
  slug: string;
  name: string;
  originName: string | null;
  thumbUrl: string | null;
  posterUrl: string | null;
  year: number | null;
  type: string | null;
  quality: string | null;
  lang: string | null;
  time: string | null;
  episodeCurrent: string | null;
  tmdb: TmdbRef | null;
  provider: ProviderCode;
}

export interface FavoriteEntry extends MovieSnapshot {
  /** Moc thoi gian luu, dung de sap xep moi nhat len dau. */
  savedAt: number;
}

/** Mot lan tim kiem da luu. */
export interface SearchEntry {
  keyword: string;
  /** Moc thoi gian tim. Ban ghi cu chi co chuoi nen khong co moc, luc do bang 0. */
  at: number;
}

export interface HistoryEntry extends MovieSnapshot {
  serverIndex: number;
  episodeIndex: number;
  serverName: string | null;
  episodeName: string | null;
  watchedAt: number;
}

export function toSnapshot(movie: MovieSummary | MovieDetail): MovieSnapshot {
  return {
    slug: movie.slug,
    name: movie.name,
    originName: movie.originName,
    thumbUrl: movie.thumbUrl,
    posterUrl: movie.posterUrl,
    year: movie.year,
    type: movie.type,
    quality: movie.quality,
    lang: movie.lang,
    time: movie.time,
    episodeCurrent: movie.episodeCurrent,
    tmdb: movie.tmdb,
    provider: movie.provider,
  };
}

/** Dung lai MovieSummary tu anh chup de tai su dung cac component san co. */
export function toSummary(snapshot: MovieSnapshot): MovieSummary {
  return {
    ...snapshot,
    id: snapshot.slug,
    categories: [],
    countries: [],
    imdb: null,
    modifiedAt: null,
  };
}

function isSnapshot(value: unknown): value is MovieSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const { slug, name, provider } = value as Partial<MovieSnapshot>;
  return typeof slug === "string" && typeof name === "string" && typeof provider === "string";
}

function parseFavorites(value: unknown): FavoriteEntry[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (item): item is FavoriteEntry =>
      isSnapshot(item) && typeof (item as FavoriteEntry).savedAt === "number",
  );
}

function parseHistory(value: unknown): HistoryEntry[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is HistoryEntry => {
    if (!isSnapshot(item)) return false;
    const entry = item as HistoryEntry;
    return (
      typeof entry.watchedAt === "number" &&
      Number.isInteger(entry.serverIndex) &&
      Number.isInteger(entry.episodeIndex)
    );
  });
}

/**
 * Doc lich su tim kiem. Ban cu luu mang chuoi, ban moi luu kem moc thoi gian;
 * ham nay nhan ca hai nen nguoi dung khong mat lich su da co.
 */
function parseSearches(value: unknown): SearchEntry[] | null {
  if (!Array.isArray(value)) return null;

  return value
    .map((item): SearchEntry | null => {
      if (typeof item === "string") {
        return item.trim() ? { keyword: item, at: 0 } : null;
      }
      if (typeof item === "object" && item !== null) {
        const entry = item as Partial<SearchEntry>;
        if (typeof entry.keyword === "string" && entry.keyword.trim()) {
          return { keyword: entry.keyword, at: typeof entry.at === "number" ? entry.at : 0 };
        }
      }
      return null;
    })
    .filter((entry): entry is SearchEntry => entry !== null);
}

const EMPTY_FAVORITES: FavoriteEntry[] = [];
const EMPTY_HISTORY: HistoryEntry[] = [];
const EMPTY_SEARCHES: SearchEntry[] = [];

/** Danh sach phim da luu, moi nhat dung dau. */
export function useFavorites() {
  const [favorites, write] = useLocalStorage<FavoriteEntry[]>(
    FAVORITES_KEY,
    EMPTY_FAVORITES,
    parseFavorites,
  );

  const isSaved = useCallback(
    (slug: string, provider: string) =>
      favorites.some((item) => item.slug === slug && item.provider === provider),
    [favorites],
  );

  /** Luu neu chua co, bo luu neu da co. */
  const toggle = useCallback(
    (movie: MovieSummary | MovieDetail) => {
      write((current) => {
        const rest = current.filter(
          (item) => !(item.slug === movie.slug && item.provider === movie.provider),
        );
        if (rest.length !== current.length) {
          return rest;
        }
        const entry: FavoriteEntry = { ...toSnapshot(movie), savedAt: Date.now() };
        return [entry, ...rest].slice(0, MAX_FAVORITES);
      });
    },
    [write],
  );

  const remove = useCallback(
    (slug: string, provider: string) => {
      write((current) =>
        current.filter((item) => !(item.slug === slug && item.provider === provider)),
      );
    },
    [write],
  );

  const clear = useCallback(() => write([]), [write]);

  return { favorites, isSaved, toggle, remove, clear };
}

/** Lich su xem: phim nao dang xem toi tap nao. */
export function useWatchHistory() {
  const [history, write] = useLocalStorage<HistoryEntry[]>(
    HISTORY_KEY,
    EMPTY_HISTORY,
    parseHistory,
  );

  const entryFor = useCallback(
    (slug: string, provider: string): HistoryEntry | null =>
      history.find((item) => item.slug === slug && item.provider === provider) ?? null,
    [history],
  );

  /** Ghi lai tap dang xem, day phim len dau danh sach. */
  const record = useCallback(
    (
      movie: MovieSummary | MovieDetail,
      position: {
        serverIndex: number;
        episodeIndex: number;
        serverName: string | null;
        episodeName: string | null;
      },
    ) => {
      write((current) => {
        const entry: HistoryEntry = {
          ...toSnapshot(movie),
          ...position,
          watchedAt: Date.now(),
        };
        const rest = current.filter(
          (item) => !(item.slug === movie.slug && item.provider === movie.provider),
        );
        return [entry, ...rest].slice(0, MAX_HISTORY);
      });
    },
    [write],
  );

  const remove = useCallback(
    (slug: string, provider: string) => {
      write((current) =>
        current.filter((item) => !(item.slug === slug && item.provider === provider)),
      );
    },
    [write],
  );

  const clear = useCallback(() => write([]), [write]);

  return { history, entryFor, record, remove, clear };
}

/** Giay da xem cua tung tap, khoa la "provider:slug:server:episode". */
type Positions = Record<string, number>;

const EMPTY_POSITIONS: Positions = {};

function parsePositions(value: unknown): Positions | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result: Positions = {};
  for (const [key, seconds] of Object.entries(value as Record<string, unknown>)) {
    if (typeof seconds === "number" && seconds > 0) {
      result[key] = seconds;
    }
  }
  return result;
}

/**
 * Nho vi tri dang xem cua tung tap de mo lai la phat tiep dung cho.
 *
 * Tap xem gan xong thi khong luu: lan sau mo lai nen bat dau tu dau
 * thay vi nhay thang vao doan ket.
 */
export function usePlaybackPositions() {
  const [positions, write] = useLocalStorage<Positions>(
    POSITIONS_KEY,
    EMPTY_POSITIONS,
    parsePositions,
  );

  const positionOf = useCallback((key: string) => positions[key] ?? 0, [positions]);

  const remember = useCallback(
    (key: string, seconds: number, duration: number) => {
      const nearlyDone = duration > 0 && seconds > duration - 30;
      write((current) => {
        if (nearlyDone || seconds < 10) {
          if (current[key] === undefined) return current;
          const next = { ...current };
          delete next[key];
          return next;
        }
        return { ...current, [key]: Math.floor(seconds) };
      });
    },
    [write],
  );

  return { positionOf, remember };
}

/** Giay ket thuc doan gioi thieu, khoa la "provider:slug". */
type Intros = Record<string, number>;

const EMPTY_INTROS: Intros = {};

function parseIntros(value: unknown): Intros | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result: Intros = {};
  for (const [key, seconds] of Object.entries(value as Record<string, unknown>)) {
    if (typeof seconds === "number" && seconds > 0) {
      result[key] = seconds;
    }
  }
  return result;
}

/**
 * Nho doan gioi thieu dai bao lau cho tung bo phim.
 *
 * Khong co san danh sach moc gioi thieu cho tung phim, nen ung dung hoc tu nguoi dung:
 * lan dau bam "Bo qua gioi thieu" thi ghi lai moc do, cac tap sau cua chinh bo phim
 * do se tu nhay qua.
 */
export function useIntroSkips() {
  const [intros, write] = useLocalStorage<Intros>(INTRO_KEY, EMPTY_INTROS, parseIntros);

  const introOf = useCallback((key: string) => intros[key] ?? 0, [intros]);

  const rememberIntro = useCallback(
    (key: string, seconds: number) => {
      write((current) => ({ ...current, [key]: Math.round(seconds) }));
    },
    [write],
  );

  const forgetIntro = useCallback(
    (key: string) => {
      write((current) => {
        if (current[key] === undefined) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [write],
  );

  return { introOf, rememberIntro, forgetIntro };
}

/** Mot moc chuong do nguoi dung dat trong mot tap. */
export interface Chapter {
  /** Giay bat dau cua chuong. */
  at: number;
  title: string;
}

/**
 * Chuong cua tung tap, khoa la "provider:slug:server:tap".
 *
 * Khac moc gioi thieu (dat cho ca bo phim vi tap nao cung cung mot doan dau),
 * chuong gan voi noi dung cu the cua tung tap nen phai luu rieng.
 */
type ChapterMap = Record<string, Chapter[]>;

const EMPTY_CHAPTERS: ChapterMap = {};

/** Mang rong dung chung: tra ve [] moi lan se lam cac useMemo ben ngoai chay lai. */
const EMPTY_LIST: Chapter[] = [];

function parseChapters(value: unknown): ChapterMap | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const result: ChapterMap = {};
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;

    const marks = list
      .filter(
        (item): item is Chapter =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Chapter).at === "number" &&
          (item as Chapter).at >= 0 &&
          typeof (item as Chapter).title === "string",
      )
      .map((item) => ({ at: Math.round(item.at), title: item.title }))
      .sort((a, b) => a.at - b.at);

    if (marks.length > 0) result[key] = marks;
  }
  return result;
}

/** Bo hai moc trung giay nhau, giu moc dat sau. */
function mergeChapter(list: Chapter[], mark: Chapter): Chapter[] {
  return [...list.filter((item) => item.at !== mark.at), mark]
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_CHAPTERS);
}

/**
 * Chuong do nguoi dung tu danh dau.
 *
 * Ca KKPhim lan NguonC deu khong tra ve moc chuong, va khong co cach nao doan dung
 * tu luong video, nen day la du lieu nguoi xem tu them - giong cach hoc moc gioi thieu.
 */
export function useChapters() {
  const [chapters, write] = useLocalStorage<ChapterMap>(
    CHAPTERS_KEY,
    EMPTY_CHAPTERS,
    parseChapters,
  );

  const chaptersOf = useCallback((key: string) => chapters[key] ?? EMPTY_LIST, [chapters]);

  const addChapter = useCallback(
    (key: string, at: number, title: string) => {
      const mark = { at: Math.round(at), title: title.trim() };
      if (!mark.title) return;
      write((current) => ({ ...current, [key]: mergeChapter(current[key] ?? [], mark) }));
    },
    [write],
  );

  const renameChapter = useCallback(
    (key: string, at: number, title: string) => {
      const name = title.trim();
      if (!name) return;
      write((current) => ({
        ...current,
        [key]: (current[key] ?? []).map((item) =>
          item.at === at ? { ...item, title: name } : item,
        ),
      }));
    },
    [write],
  );

  const removeChapter = useCallback(
    (key: string, at: number) => {
      write((current) => {
        const rest = (current[key] ?? []).filter((item) => item.at !== at);
        const next = { ...current };
        if (rest.length > 0) {
          next[key] = rest;
        } else {
          delete next[key];
        }
        return next;
      });
    },
    [write],
  );

  const clearChapters = useCallback(
    (key: string) => {
      write((current) => {
        if (current[key] === undefined) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [write],
  );

  /** Ghi mot loat moc trong mot lan, dung cho ket qua quet canh. */
  const setChapters = useCallback(
    (key: string, marks: Chapter[]) => {
      write((current) => {
        let list = current[key] ?? [];
        for (const mark of marks) {
          list = mergeChapter(list, mark);
        }
        return { ...current, [key]: list };
      });
    },
    [write],
  );

  return { chaptersOf, addChapter, setChapters, renameChapter, removeChapter, clearChapters };
}

/** Cac tu khoa vua tim, hien lai duoi o tim kiem. */
export function useRecentSearches() {
  const [searches, write] = useLocalStorage<SearchEntry[]>(
    SEARCHES_KEY,
    EMPTY_SEARCHES,
    parseSearches,
  );

  const push = useCallback(
    (keyword: string) => {
      const value = keyword.trim();
      if (!value) return;
      write((current) => {
        const rest = current.filter(
          (item) => item.keyword.toLowerCase() !== value.toLowerCase(),
        );
        return [{ keyword: value, at: Date.now() }, ...rest].slice(0, MAX_SEARCHES);
      });
    },
    [write],
  );

  const remove = useCallback(
    (keyword: string) =>
      write((current) => current.filter((item) => item.keyword !== keyword)),
    [write],
  );

  const clear = useCallback(() => write([]), [write]);

  return { searches, push, remove, clear };
}
