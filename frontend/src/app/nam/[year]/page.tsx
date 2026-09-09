import { notFound } from "next/navigation";

import { MovieListView } from "@/components/movie/MovieListView";
import { ErrorState } from "@/components/ui/States";
import { api, errorMessage } from "@/lib/api";
import { readPage, readProvider, withProvider } from "@/lib/nav";
import type { MovieSummary, PageResponse, ProviderCode } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/nam/[year]">) {
  const { year } = await params;
  return { title: `Phim năm ${year}` };
}

export default async function YearPage({ params, searchParams }: PageProps<"/nam/[year]">) {
  const { year } = await params;
  const search = await searchParams;

  const value = Number.parseInt(year, 10);
  if (!Number.isFinite(value) || value < 1900 || value > 2100) {
    notFound();
  }

  const provider = readProvider(search.provider);
  const page = readPage(search.page);
  const basePath = `/nam/${value}`;

  let result: PageResponse<MovieSummary> | null = null;
  let failure: string | null = null;

  try {
    result = await api.listByYear(value, { page, limit: 24, provider });
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
      title={`Phim năm ${value}`}
      page={result}
      basePath={basePath}
      chips={yearChips(value, provider)}
      query={{ provider: provider === "kkphim" ? undefined : provider }}
    />
  );
}

/** Muoi hai nam gan nhat de nguoi dung nhay qua lai nhanh. */
function yearChips(activeYear: number, provider: ProviderCode) {
  const current = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, index) => current - index).map((year) => ({
    label: String(year),
    href: withProvider(`/nam/${year}`, provider),
    active: year === activeYear,
  }));
}
