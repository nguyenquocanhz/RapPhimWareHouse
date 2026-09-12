import { apiBase, webBase } from "./settings";
import { STANDALONE } from "./config";
import * as kkphim from "./kkphim";

/** Vo boc phan hoi chung cua backend. */
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: { code?: string; message?: string } | null;
}

interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface Taxonomy {
  id: string;
  name: string;
  slug: string;
}

export interface MovieSummary {
  id: string;
  slug: string;
  name: string;
  originName?: string | null;
  posterUrl?: string | null;
  thumbUrl?: string | null;
  year?: number | null;
  type?: string | null;
  quality?: string | null;
  lang?: string | null;
  episodeCurrent?: string | null;
  categories?: Taxonomy[] | null;
  provider?: string | null;
  modifiedAt?: string | null;
}

export interface Episode {
  name: string;
  slug: string;
  filename?: string | null;
  // Ten truong khop DTO backend (KKPhim/NguonC/VSMOV chuan hoa ve day):
  // linkM3u8 = phat truc tiep HLS, linkEmbed = trang nhung cua nguon.
  linkEmbed?: string | null;
  linkM3u8?: string | null;
  subtitles?: { label: string; lang: string; url: string }[] | null;
}

export interface EpisodeServer {
  serverName?: string | null;
  episodes: Episode[];
}

export interface MovieDetail extends MovieSummary {
  content?: string | null;
  status?: string | null;
  time?: string | null;
  episodeTotal?: string | null;
  actors?: string[] | null;
  directors?: string[] | null;
  countries?: Taxonomy[] | null;
  servers?: EpisodeServer[] | null;
}

/** Cac muc trong thanh chip dau trang chu - khop ListType cua backend. */
export const LIST_TYPES = [
  { type: "phim-bo", label: "Phim bộ" },
  { type: "phim-le", label: "Phim lẻ" },
  { type: "tv-shows", label: "TV Shows" },
  { type: "hoat-hinh", label: "Hoạt hình" },
  { type: "phim-vietsub", label: "Vietsub" },
  { type: "phim-thuyet-minh", label: "Thuyết minh" },
  { type: "phim-long-tieng", label: "Lồng tiếng" },
] as const;

async function getJson<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(apiBase() + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.success === false) {
    throw new Error(body.error?.message ?? body.message ?? `Lỗi ${response.status}`);
  }
  return body.data as T;
}

export function latest(provider: string, page = 1, limit = 24) {
  if (STANDALONE) return kkphim.latest(page);
  return getJson<Page<MovieSummary>>("/movies/latest", { provider, page, limit });
}

export function listByType(provider: string, type: string, page = 1, limit = 24) {
  if (STANDALONE) return kkphim.listByType(type, page);
  return getJson<Page<MovieSummary>>("/movies", { provider, type, page, limit });
}

export function search(provider: string, keyword: string, page = 1, limit = 24) {
  if (STANDALONE) return kkphim.search(keyword, page);
  return getJson<Page<MovieSummary>>("/movies/search", { provider, keyword, page, limit });
}

export function detail(provider: string, slug: string) {
  if (STANDALONE) return kkphim.detail(slug);
  return getJson<MovieDetail>(`/movies/${encodeURIComponent(slug)}`, { provider });
}

export function providers(): Promise<string[]> {
  if (STANDALONE) return Promise.resolve(["kkphim"]);
  return getJson<string[]>("/providers");
}

/**
 * Anh nguon cong cong la URL tuyet doi; anh kho rieng la URL tuong doi (/api/thumbnail/..)
 * do web phuc vu, nen phai ghep WEB_BASE. Tra null de the anh tu chuyen sang o giu cho.
 */
export function imageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return webBase() + (url.startsWith("/") ? url : "/" + url);
}
