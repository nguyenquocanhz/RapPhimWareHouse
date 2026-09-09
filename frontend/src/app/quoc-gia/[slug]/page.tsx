import { MovieListView } from "@/components/movie/MovieListView";
import { ErrorState } from "@/components/ui/States";
import { api, errorMessage, safe } from "@/lib/api";
import { readPage, readProvider, withProvider } from "@/lib/nav";
import type { MovieSummary, PageResponse, ProviderCode, Taxonomy } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/quoc-gia/[slug]">) {
  const { slug } = await params;
  const countries = await safe(api.countries(), [] as Taxonomy[]);
  const name = countries.find((item) => item.slug === slug)?.name ?? slug;
  return { title: `Phim ${name}` };
}

export default async function CountryPage({
  params,
  searchParams,
}: PageProps<"/quoc-gia/[slug]">) {
  const { slug } = await params;
  const search = await searchParams;

  const provider = readProvider(search.provider);
  const page = readPage(search.page);
  const basePath = `/quoc-gia/${slug}`;

  const countries = await safe(api.countries(), [] as Taxonomy[]);
  const current = countries.find((item) => item.slug === slug);

  let result: PageResponse<MovieSummary> | null = null;
  let failure: string | null = null;

  try {
    result = await api.listByCountry(slug, { page, limit: 24, provider });
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
      chips={countryChips(countries, slug, provider)}
      query={{ provider: provider === "kkphim" ? undefined : provider }}
    />
  );
}

/** Dai chip liet ke cac quoc gia khac de nhay nhanh giua chung. */
function countryChips(countries: Taxonomy[], activeSlug: string, provider: ProviderCode) {
  return countries.map((country) => ({
    label: country.name,
    href: withProvider(`/quoc-gia/${country.slug}`, provider),
    active: country.slug === activeSlug,
  }));
}
