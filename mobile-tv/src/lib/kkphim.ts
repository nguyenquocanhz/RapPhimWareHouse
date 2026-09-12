/**
 * Nguon phim truc tiep tu KKPhim (phimapi.com) - dung cho ban STANDALONE, khong can
 * backend rieng. Anh xa JSON tho cua phimapi ve dung kieu du lieu app dang dung
 * (MovieSummary/MovieDetail), nen cac man hinh khong phai doi gi.
 */
import { KKPHIM_API, KKPHIM_CDN } from "./config";
import { MovieDetail, MovieSummary, Page, Taxonomy } from "./api";

function img(u?: string | null): string | null {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return KKPHIM_CDN + (u.startsWith("/") ? u : "/" + u);
}

function tax(list: unknown): Taxonomy[] {
  if (!Array.isArray(list)) return [];
  return list.map((c: Record<string, unknown>) => ({
    id: String(c._id ?? c.id ?? c.slug ?? ""),
    name: String(c.name ?? ""),
    slug: String(c.slug ?? ""),
  }));
}

function mapItem(it: Record<string, any>): MovieSummary {
  return {
    id: String(it._id ?? it.slug ?? ""),
    slug: String(it.slug ?? ""),
    name: String(it.name ?? ""),
    originName: it.origin_name ?? null,
    posterUrl: img(it.poster_url) ?? img(it.thumb_url),
    thumbUrl: img(it.thumb_url),
    year: it.year ?? null,
    type: it.type ?? null,
    quality: it.quality ?? null,
    lang: it.lang ?? null,
    episodeCurrent: it.episode_current ?? null,
    categories: tax(it.category),
    provider: "kkphim",
    modifiedAt: it.modified?.time ?? null,
  };
}

async function getJson(url: string): Promise<Record<string, any>> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Lỗi ${res.status}`);
  return (await res.json()) as Record<string, any>;
}

function toPage(items: MovieSummary[], pag: Record<string, any> | undefined): Page<MovieSummary> {
  return {
    items,
    meta: {
      page: pag?.currentPage ?? 1,
      limit: pag?.totalItemsPerPage ?? items.length,
      totalItems: pag?.totalItems ?? items.length,
      totalPages: pag?.totalPages ?? 1,
    },
  };
}

/** Nhom /v1/api tra ve {data:{items, params:{pagination}}}. */
async function fetchList(path: string): Promise<Page<MovieSummary>> {
  const j = await getJson(`${KKPHIM_API}${path}`);
  const data = (j.data ?? j) as Record<string, any>;
  const items = ((data.items ?? []) as Record<string, any>[]).map(mapItem);
  return toPage(items, data.params?.pagination ?? j.pagination);
}

export function latest(page = 1) {
  return fetchList(`/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`);
}

export function listByType(type: string, page = 1) {
  return fetchList(`/v1/api/danh-sach/${encodeURIComponent(type)}?page=${page}`);
}

export function search(keyword: string, page = 1) {
  return fetchList(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
}

export async function detail(slug: string): Promise<MovieDetail> {
  const j = await getJson(`${KKPHIM_API}/phim/${encodeURIComponent(slug)}`);
  const m = (j.movie ?? {}) as Record<string, any>;
  const servers = ((j.episodes ?? []) as Record<string, any>[]).map((s) => ({
    serverName: s.server_name ?? null,
    episodes: ((s.server_data ?? []) as Record<string, any>[]).map((e) => ({
      name: String(e.name ?? ""),
      slug: String(e.slug ?? ""),
      filename: e.filename ?? null,
      linkEmbed: e.link_embed ?? null,
      linkM3u8: e.link_m3u8 ?? null,
    })),
  }));
  return {
    ...mapItem(m),
    content: m.content ?? null,
    status: m.status ?? null,
    time: m.time ?? null,
    episodeTotal: m.episode_total != null ? String(m.episode_total) : null,
    actors: Array.isArray(m.actor) ? m.actor : null,
    directors: Array.isArray(m.director) ? m.director : null,
    countries: tax(m.country),
    servers,
  };
}
