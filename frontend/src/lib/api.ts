import type {
  ApiResponse,
  ListParams,
  ListTypeOption,
  MovieDetail,
  MovieSummary,
  PageResponse,
  Taxonomy,
  TmdbDetail,
  TmdbDiscoverItem,
  TmdbStatus,
} from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** Loi tra ve tu backend, giu lai ma loi de trang goi co the phan biet 404 voi loi khac. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }

  get isNotFound() {
    return this.status === 404;
  }
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Goi backend va boc tach envelope ApiResponse.
 *
 * @param path duong dan tuong doi, vi du "/api/v1/movies/latest"
 * @param params tham so query, gia tri undefined se bi bo qua
 * @param revalidate so giay cache cua Next, mac dinh 60
 */
async function request<T>(
  path: string,
  params: Record<string, unknown> = {},
  revalidate = 60,
): Promise<T> {
  const url = `${BASE_URL}${path}${buildQuery(params)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
  } catch {
    throw new ApiRequestError(
      503,
      "BACKEND_UNREACHABLE",
      `Khong kết nối được tới API tại ${BASE_URL}. Hãy chắc chắn backend đang chạy.`,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const code = (payload as { code?: string } | null)?.code ?? "UNKNOWN_ERROR";
    const message =
      (payload as { message?: string } | null)?.message ?? `Yêu cầu thất bại (HTTP ${response.status})`;
    throw new ApiRequestError(response.status, code, message);
  }

  return (payload as ApiResponse<T>).data;
}

function listParams(params: ListParams = {}) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 24,
    category: params.category,
    country: params.country,
    year: params.year,
    sortField: params.sortField,
    sortType: params.sortType,
    provider: params.provider,
  };
}

export const api = {
  /** Phim moi cap nhat, dung cho trang chu. */
  latest(params: ListParams = {}) {
    return request<PageResponse<MovieSummary>>("/api/v1/movies/latest", listParams(params), 60);
  },

  /** Danh sach theo nhom: phim-bo, phim-le, tv-shows, hoat-hinh... */
  listByType(type: string, params: ListParams = {}) {
    return request<PageResponse<MovieSummary>>(
      "/api/v1/movies",
      { type, ...listParams(params) },
      120,
    );
  },

  /** Tim kiem theo tu khoa. */
  search(keyword: string, params: ListParams = {}) {
    return request<PageResponse<MovieSummary>>(
      "/api/v1/movies/search",
      { keyword, ...listParams(params) },
      30,
    );
  },

  listByCategory(slug: string, params: ListParams = {}) {
    return request<PageResponse<MovieSummary>>(
      `/api/v1/movies/category/${slug}`,
      listParams(params),
      120,
    );
  },

  listByCountry(slug: string, params: ListParams = {}) {
    return request<PageResponse<MovieSummary>>(
      `/api/v1/movies/country/${slug}`,
      listParams(params),
      120,
    );
  },

  listByYear(year: number, params: ListParams = {}) {
    return request<PageResponse<MovieSummary>>(
      `/api/v1/movies/year/${year}`,
      listParams(params),
      120,
    );
  },

  /**
   * Trang thai hien tai cua nhieu phim. Dung de doi chieu xem phim dang theo doi
   * da co tap moi chua. Toi da 30 slug moi lan.
   */
  batch(slugs: string[], provider?: string) {
    return request<MovieSummary[]>(
      "/api/v1/movies/batch",
      { slugs: slugs.join(","), provider },
      60,
    );
  },

  /** Chi tiet phim kem danh sach tap. */
  detail(slug: string, provider?: string) {
    return request<MovieDetail>(`/api/v1/movies/${slug}`, { provider }, 300);
  },

  categories(provider?: string) {
    return request<Taxonomy[]>("/api/v1/categories", { provider }, 3600);
  },

  countries(provider?: string) {
    return request<Taxonomy[]>("/api/v1/countries", { provider }, 3600);
  },

  listTypes() {
    return request<ListTypeOption[]>("/api/v1/list-types", {}, 3600);
  },

  /** Duyet tim phim tren TheMovieDB. TMDB co dinh 20 ket qua moi trang. */
  tmdbDiscover(params: TmdbDiscoverParams = {}) {
    return request<PageResponse<TmdbDiscoverItem>>(
      "/api/v1/tmdb/discover",
      {
        page: params.page ?? 1,
        sortBy: params.sortBy,
        withGenres: params.withGenres,
        withOriginalLanguage: params.withOriginalLanguage,
        year: params.year,
        voteAverageGte: params.voteAverageGte,
        voteCountGte: params.voteCountGte,
        region: params.region,
      },
      300,
    );
  },

  /** Danh muc the loai cua TMDB, dung de dich genreIds sang ten. */
  tmdbGenres(type: "movie" | "tv" = "movie") {
    return request<Taxonomy[]>("/api/v1/tmdb/genres", { type }, 3600);
  },

  /** Chi tiet mot phim tren TMDB, tra theo ma TMDB. */
  tmdbMovie(id: string, type: "movie" | "tv" = "movie") {
    return request<TmdbDetail>(`/api/v1/tmdb/movies/${id}`, { type }, 3600);
  },

  tmdbStatus() {
    return request<TmdbStatus>("/api/v1/tmdb/status", {}, 60);
  },
};

/** Bo tham so cho endpoint duyet tim cua TMDB. */
export interface TmdbDiscoverParams {
  page?: number;
  sortBy?: string;
  withGenres?: string;
  withOriginalLanguage?: string;
  year?: number;
  voteAverageGte?: number;
  voteCountGte?: number;
  region?: string;
}

/**
 * Duong dan tai file NFO cho Kodi / Jellyfin / Emby.
 * Backend dat san Content-Disposition nen the <a> thuong la du, khong can JavaScript.
 */
export function nfoUrl(slug: string, provider?: string): string {
  const query = provider && provider !== "kkphim" ? `?provider=${provider}` : "";
  return `${BASE_URL}/api/v1/movies/${slug}/nfo${query}`;
}

/**
 * Doi duong phu de cua backend thanh duong cung goc voi trang.
 *
 * <p>Backend tra ve "/api/v1/homelab/subtitle?key=...". The &lt;track&gt; doi phu de
 * cung goc, neu khong phai bat crossOrigin tren ca the &lt;video&gt; - ma lam vay thi
 * duong phat co han cua kho cung bi doi CORS theo. Nen doi sang route handler cua
 * chinh ung dung Next.</p>
 */
export function subtitleUrl(raw: string): string {
  try {
    // Duong tuong doi nen phai ghep tam mot goc de doc duoc tham so.
    const key = new URL(raw, "http://local").searchParams.get("key");
    return key ? `/api/subtitle?key=${encodeURIComponent(key)}` : raw;
  } catch {
    return raw;
  }
}

/** Doc thong diep loi de hien cho nguoi dung, ke ca khi loi khong phai tu API. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "Đã có lỗi không xác định.";
}

/**
 * Goi API nhung khong de loi lam vo trang - dung cho cac khoi phu nhu sidebar.
 */
export async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
