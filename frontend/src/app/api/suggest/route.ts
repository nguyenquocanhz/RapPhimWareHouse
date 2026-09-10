import { NextResponse, type NextRequest } from "next/server";

import { api } from "@/lib/api";

/**
 * Goi y khi go o o tim kiem (giong YouTube): tra ve vai phim khop ten va vai the
 * loai khop, chia thanh nhom.
 *
 * Chay o server nen dia chi backend khong lo ra trinh duyet va khong vuong CORS -
 * cung ly do nhu /api/updates. Goi y la thu "co cung tot, khong co cung khong sao"
 * nen dung Promise.allSettled: mot nhanh hong khong lam mat ca hai.
 */

/** Bo dau tieng Viet de so khop khong phan biet dau. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export async function GET(request: NextRequest) {
  const keyword = (request.nextUrl.searchParams.get("keyword") ?? "").trim();

  // Go it hon hai ky tu thi chua goi y: vua ton API vua ra qua nhieu ket qua.
  if (keyword.length < 2) {
    return NextResponse.json({ genres: [], movies: [] });
  }

  const norm = normalize(keyword);

  const [movieResult, categoryResult] = await Promise.allSettled([
    api.search(keyword, { limit: 6 }),
    api.categories(),
  ]);

  const movies =
    movieResult.status === "fulfilled"
      ? movieResult.value.items.slice(0, 6).map((movie) => ({
          slug: movie.slug,
          name: movie.name,
          year: movie.year,
          thumbUrl: movie.thumbUrl,
          posterUrl: movie.posterUrl,
          provider: movie.provider,
        }))
      : [];

  const genres =
    categoryResult.status === "fulfilled"
      ? categoryResult.value
          .filter((genre) => normalize(genre.name).includes(norm))
          .slice(0, 4)
      : [];

  return NextResponse.json({ genres, movies });
}
