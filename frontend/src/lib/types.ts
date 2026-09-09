/**
 * Cac kieu du lieu phan anh dung schema cua RapPhim WareHouse API.
 * Doi chieu voi Swagger tai http://localhost:8080/swagger-ui.html
 */

export type ProviderCode = "kkphim" | "nguonc" | "homelab";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  status: number;
  code: string;
  message: string;
  path: string;
  details: string[];
  timestamp: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PageResponse<T> {
  items: T[];
  meta: PageMeta;
  provider: ProviderCode;
}

export interface Taxonomy {
  id: string | null;
  name: string;
  slug: string;
}

export interface TmdbRef {
  id: string;
  type: string | null;
  season: number | null;
  voteAverage: number | null;
  voteCount: number | null;
}

export interface ImdbRef {
  id: string;
  voteAverage: number | null;
  voteCount: number | null;
}

export interface MovieSummary {
  id: string;
  slug: string;
  name: string;
  originName: string | null;
  posterUrl: string | null;
  thumbUrl: string | null;
  year: number | null;
  type: string | null;
  quality: string | null;
  lang: string | null;
  time: string | null;
  episodeCurrent: string | null;
  categories: Taxonomy[];
  countries: Taxonomy[];
  tmdb: TmdbRef | null;
  imdb: ImdbRef | null;
  provider: ProviderCode;
  modifiedAt: string | null;
}

export interface Episode {
  name: string | null;
  slug: string | null;
  filename: string | null;
  linkEmbed: string | null;
  linkM3u8: string | null;
  /** File phat truc tiep (mp4/mkv) cua kho rieng; hai nguon cong cong khong co. */
  linkDirect?: string | null;
  /** Cac duong phu de roi, chi kho rieng moi co. */
  subtitles?: Subtitle[];
}

/** Mot duong phu de di kem tap phim. */
export interface Subtitle {
  label: string;
  lang: string;
  /** Duong dan tren backend, dang "/api/v1/homelab/subtitle?key=..." */
  url: string;
  defaultTrack: boolean;
}

export interface EpisodeServer {
  serverName: string;
  episodes: Episode[];
}

export interface MovieDetail extends Omit<MovieSummary, "categories" | "countries"> {
  content: string | null;
  trailerUrl: string | null;
  status: string | null;
  episodeTotal: string | null;
  actors: string[];
  directors: string[];
  categories: Taxonomy[];
  countries: Taxonomy[];
  servers: EpisodeServer[];
}

/** Mot phim trong ket qua duyet tim tren TheMovieDB. */
export interface TmdbDiscoverItem {
  id: string;
  title: string | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genreIds: number[];
}

/** Mot vai dien lay tu TheMovieDB. */
export interface TmdbCast {
  name: string | null;
  character: string | null;
  order: number | null;
  profileUrl: string | null;
}

/** Metadata day du cua mot phim tren TheMovieDB. */
export interface TmdbDetail {
  id: string;
  type: string | null;
  title: string | null;
  originalTitle: string | null;
  overview: string | null;
  tagline: string | null;
  homepage: string | null;
  status: string | null;
  releaseDate: string | null;
  runtime: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  countries: string[];
  studios: string[];
  directors: string[];
  cast: TmdbCast[];
  imdbId: string | null;
}

/** Backend da co khoa TMDB hay chua. */
export interface TmdbStatus {
  configured: boolean;
  message: string;
}

export interface ListTypeOption {
  slug: string;
  label: string;
}

/** Tham so chung cho moi truy van danh sach. */
export interface ListParams {
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
  year?: number;
  sortField?: string;
  sortType?: "asc" | "desc";
  provider?: ProviderCode;
}
