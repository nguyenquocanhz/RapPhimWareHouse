import { MovieRow } from "@/components/movie/MovieRow";
import { Pagination } from "@/components/movie/Pagination";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui/States";
import { api, errorMessage } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { readPage, readProvider } from "@/lib/nav";
import type { MovieSummary, PageResponse } from "@/lib/types";

export const metadata = {
  title: "Tìm kiếm",
};

export default async function SearchPage({ searchParams }: PageProps<"/tim-kiem">) {
  const params = await searchParams;
  const raw = Array.isArray(params.keyword) ? params.keyword[0] : params.keyword;
  const keyword = (raw ?? "").trim();
  const provider = readProvider(params.provider);
  const page = readPage(params.page);

  if (!keyword) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <EmptyState
          title="Nhập từ khoá để tìm phim"
          description="Dùng ô tìm kiếm ở thanh trên cùng để tìm theo tên tiếng Việt hoặc tên gốc."
        />
      </div>
    );
  }

  let result: PageResponse<MovieSummary> | null = null;
  let failure: string | null = null;

  try {
    result = await api.search(keyword, { page, limit: 24, provider });
  } catch (error) {
    failure = errorMessage(error);
  }

  if (!result) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <ErrorState message={failure ?? "Không tìm kiếm được."} />
      </div>
    );
  }

  const { items, meta } = result;

  return (
    <div className="px-4 py-5 sm:px-6">
      <PageHeading
        title={`Kết quả cho "${keyword}"`}
        subtitle={`${formatCount(meta.totalItems)} phim • trang ${meta.page}/${formatCount(meta.totalPages)} • nguồn ${result.provider}`}
      />

      {/* Doi nguon tim kiem ma giu nguyen tu khoa. */}
      <div className="mb-6 flex gap-3">
        <ProviderTab keyword={keyword} code="kkphim" label="KKPhim" active={provider === "kkphim"} />
        <ProviderTab keyword={keyword} code="nguonc" label="NguonC" active={provider === "nguonc"} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Không tìm thấy phim phù hợp"
          description="Thử rút ngắn từ khoá, bỏ dấu, hoặc đổi sang nguồn dữ liệu khác."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-6">
            {items.map((movie, index) => (
              <li key={`${movie.slug}-${index}`}>
                <MovieRow movie={movie} provider={result.provider} />
              </li>
            ))}
          </ul>
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            basePath="/tim-kiem"
            query={{
              keyword,
              provider: provider === "kkphim" ? undefined : provider,
            }}
          />
        </>
      )}
    </div>
  );
}

function ProviderTab({
  keyword,
  code,
  label,
  active,
}: {
  keyword: string;
  code: string;
  label: string;
  active: boolean;
}) {
  const href =
    code === "kkphim"
      ? `/tim-kiem?keyword=${encodeURIComponent(keyword)}`
      : `/tim-kiem?keyword=${encodeURIComponent(keyword)}&provider=${code}`;

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active
          ? "bg-chip-active font-medium text-chip-active-fg"
          : "bg-chip text-fg hover:bg-chip-hover"
      }`}
    >
      {label}
    </a>
  );
}
