import type { ReactNode } from "react";

import { ChipBar, type Chip } from "@/components/movie/ChipBar";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { Pagination } from "@/components/movie/Pagination";
import { EmptyState, PageHeading } from "@/components/ui/States";
import { formatCount } from "@/lib/format";
import type { MovieSummary, PageResponse } from "@/lib/types";

interface MovieListViewProps {
  title: string;
  page: PageResponse<MovieSummary>;
  basePath: string;
  chips?: Chip[];
  query?: Record<string, string | undefined>;
  /** An dong tom tat so luong khi trang da co tieu de rieng. */
  hideSummary?: boolean;
  /** Khoi chen giua dai chip va tieu de, vi du dai "Tiep tuc xem". */
  beforeContent?: ReactNode;
}

/**
 * Bo cuc dung chung cho moi trang danh sach: dai chip, tieu de,
 * luoi phim va phan trang.
 */
export function MovieListView({
  title,
  page,
  basePath,
  chips = [],
  query = {},
  hideSummary = false,
  beforeContent,
}: MovieListViewProps) {
  const { items, meta, provider } = page;

  const subtitle = hideSummary
    ? undefined
    : `${formatCount(meta.totalItems)} phim • trang ${meta.page}/${formatCount(meta.totalPages)} • nguồn ${provider}`;

  return (
    <div className="px-4 py-5 sm:px-6">
      <ChipBar chips={chips} />
      {beforeContent}
      <PageHeading title={title} subtitle={subtitle} />

      {items.length === 0 ? (
        <EmptyState description="Thử đổi bộ lọc hoặc chọn nguồn dữ liệu khác ở dải chip phía trên." />
      ) : (
        <>
          <MovieGrid movies={items} provider={provider} />
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            basePath={basePath}
            query={query}
          />
        </>
      )}
    </div>
  );
}
