import { notFound } from "next/navigation";

import { MovieListView } from "@/components/movie/MovieListView";
import { ErrorState } from "@/components/ui/States";
import { api, errorMessage, isUnreachable } from "@/lib/api";
import { buildChips, LIST_TYPES, readPage, readProvider } from "@/lib/nav";
import type { MovieSummary, PageResponse } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/danh-sach/[type]">) {
  const { type } = await params;
  const label = LIST_TYPES.find((item) => item.slug === type)?.label ?? "Danh sách phim";
  return { title: label };
}

export default async function ListTypePage({
  params,
  searchParams,
}: PageProps<"/danh-sach/[type]">) {
  const { type } = await params;
  const search = await searchParams;

  const listType = LIST_TYPES.find((item) => item.slug === type);
  if (!listType) {
    notFound();
  }

  const provider = readProvider(search.provider);
  const page = readPage(search.page);
  const basePath = `/danh-sach/${type}`;

  let result: PageResponse<MovieSummary> | null = null;
  let failure: string | null = null;
  let unreachable = false;

  try {
    result = await api.listByType(type, { page, limit: 24, provider });
  } catch (error) {
    failure = errorMessage(error);
    unreachable = isUnreachable(error);
  }

  if (!result) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <ErrorState message={failure ?? "Không tải được danh sách phim."} unreachable={unreachable} />
      </div>
    );
  }

  return (
    <MovieListView
      title={listType.label}
      page={result}
      basePath={basePath}
      chips={buildChips(basePath, provider)}
      query={{ provider: provider === "kkphim" ? undefined : provider }}
    />
  );
}
