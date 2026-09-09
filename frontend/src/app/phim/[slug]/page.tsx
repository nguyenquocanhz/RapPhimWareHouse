import { notFound } from "next/navigation";

import { RelatedMovies } from "@/components/movie/RelatedMovies";
import { ErrorState } from "@/components/ui/States";
import { MovieDescription } from "@/components/watch/MovieDescription";
import { WatchClient } from "@/components/watch/WatchClient";
import { api, ApiRequestError, errorMessage, isUnreachable, safe } from "@/lib/api";
import { stripHtml } from "@/lib/format";
import { readProvider } from "@/lib/nav";
import type { MovieDetail, MovieSummary, ProviderCode } from "@/lib/types";

export async function generateMetadata({ params, searchParams }: PageProps<"/phim/[slug]">) {
  const { slug } = await params;
  const provider = readProvider((await searchParams).provider);
  const movie = await safe(api.detail(slug, provider), null);

  if (!movie) {
    return { title: "Không tìm thấy phim" };
  }

  return {
    title: movie.name,
    description: stripHtml(movie.content).slice(0, 180) || undefined,
    openGraph: {
      title: movie.name,
      images: movie.posterUrl ? [movie.posterUrl] : undefined,
    },
  };
}

export default async function MoviePage({ params, searchParams }: PageProps<"/phim/[slug]">) {
  const { slug } = await params;
  const provider = readProvider((await searchParams).provider);

  let movie: MovieDetail | null = null;
  let failure: string | null = null;
  let unreachable = false;
  let missing = false;

  try {
    movie = await api.detail(slug, provider);
  } catch (error) {
    missing = error instanceof ApiRequestError && error.isNotFound;
    failure = errorMessage(error);
    unreachable = isUnreachable(error);
  }

  if (missing) {
    notFound();
  }

  if (!movie) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <ErrorState message={failure ?? "Không tải được thông tin phim."} unreachable={unreachable} />
      </div>
    );
  }

  const related = await loadRelated(movie, provider);

  return (
    <WatchClient
      movie={movie}
      related={<RelatedMovies movies={related.movies} reason={related.reason} />}
    >
      <MovieDescription movie={movie} />
    </WatchClient>
  );
}

/**
 * Goi y phim theo the loai dau tien, khong co thi theo quoc gia, cuoi cung la
 * phim moi cap nhat. Loi o buoc nay khong duoc lam hong trang xem phim nen
 * moi truy van deu di qua `safe`.
 */
async function loadRelated(
  movie: MovieDetail,
  provider: ProviderCode,
): Promise<{ movies: MovieSummary[]; reason?: string }> {
  const params = { limit: 12, provider } as const;
  const category = movie.categories[0];
  const country = movie.countries[0];

  if (category) {
    const page = await safe(api.listByCategory(category.slug, params), null);
    const movies = exclude(page?.items, movie.slug);
    if (movies.length > 0) {
      return { movies, reason: `cùng thể loại ${category.name}` };
    }
  }

  if (country) {
    const page = await safe(api.listByCountry(country.slug, params), null);
    const movies = exclude(page?.items, movie.slug);
    if (movies.length > 0) {
      return { movies, reason: `cùng quốc gia ${country.name}` };
    }
  }

  const page = await safe(api.latest(params), null);
  return { movies: exclude(page?.items, movie.slug), reason: "mới cập nhật" };
}

function exclude(items: MovieSummary[] | undefined, slug: string): MovieSummary[] {
  return (items ?? []).filter((item) => item.slug !== slug).slice(0, 10);
}
