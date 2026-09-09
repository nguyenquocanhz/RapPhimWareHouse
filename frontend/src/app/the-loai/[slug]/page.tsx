import { MovieListView } from "@/components/movie/MovieListView";
import { ErrorState } from "@/components/ui/States";
import { api, errorMessage, safe } from "@/lib/api";
import { readPage, readProvider, withProvider } from "@/lib/nav";
import type { MovieSummary, PageResponse, ProviderCode, Taxonomy } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/the-loai/[slug]">) {
  const { slug } = await params;
  const categories = await safe(api.categories(), [] as Taxonomy[]);
  const name = categories.find((item) => item.slug === slug)?.name ?? slug;
  return { title: `Phim ${name}` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/the-loai/[slug]">) {
  const { slug } = await params;
  const search = await searchParams;

  const provider = readProvider(search.provider);
  const page = readPage(search.page);
  const basePath = `/the-loai/${slug}`;

  const categories = await safe(api.categories(), [] as Taxonomy[]);
  const current = categories.find((item) => item.slug === slug);

  let result: PageResponse<MovieSummary> | null = null;
  let failure: string | null = null;

  try {
    result = await api.listByCategory(slug, { page, limit: 24, provider });
  } catch (error) {
    failure = errorMessage(error);
  }

  if (!result) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <ErrorState message={failure ?? "Không tải được danh sách phim."} />
      </div>
    );
  }

  return (
    <MovieListView
      title={`Phim ${current?.name ?? slug}`}
      page={result}
      basePath={basePath}
      chips={categoryChips(categories, slug, provider)}
      query={{ provider: provider === "kkphim" ? undefined : provider }}
    />
  );
}

/** Dai chip liet ke cac the loai khac de nhay nhanh giua chung. */
function categoryChips(categories: Taxonomy[], activeSlug: string, provider: ProviderCode) {
  return categories.map((category) => ({
    label: category.name,
    href: withProvider(`/the-loai/${category.slug}`, provider),
    active: category.slug === activeSlug,
  }));
}
