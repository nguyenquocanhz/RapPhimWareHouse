import { ContinueWatching } from "@/components/library/ContinueWatching";
import { MovieListView } from "@/components/movie/MovieListView";
import { ErrorState } from "@/components/ui/States";
import { api, errorMessage } from "@/lib/api";
import { buildChips, readPage, readProvider } from "@/lib/nav";
import type { MovieSummary, PageResponse } from "@/lib/types";

export const metadata = {
  title: "Phim mới cập nhật",
  description: "Danh sách phim vừa được cập nhật từ KKPhim và NguonC.",
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const provider = readProvider(params.provider);
  const page = readPage(params.page);

  let result: PageResponse<MovieSummary> | null = null;
  let failure: string | null = null;

  try {
    result = await api.latest({ page, limit: 24, provider });
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
      title="Phim mới cập nhật"
      page={result}
      basePath="/"
      chips={buildChips("/", provider)}
      query={{ provider: provider === "kkphim" ? undefined : provider }}
      beforeContent={<ContinueWatching />}
    />
  );
}
