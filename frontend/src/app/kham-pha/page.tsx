import { Pagination } from "@/components/movie/Pagination";
import { DiscoverCard } from "@/components/tmdb/DiscoverCard";
import {
  DiscoverFilters,
  SORT_OPTIONS,
  type DiscoverQuery,
} from "@/components/tmdb/DiscoverFilters";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui/States";
import { api, ApiRequestError, errorMessage, safe } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { readPage } from "@/lib/nav";
import type { PageResponse, Taxonomy, TmdbDiscoverItem } from "@/lib/types";

/** TMDB chi cho duyet toi trang 500. */
const MAX_PAGE = 500;

/**
 * Sap xep theo diem ma khong chan so luot danh gia thi ket qua toan phim
 * chi vai nguoi cham nhung dat 10 diem. Dat nguong toi thieu cho hop ly.
 */
const MIN_VOTES_FOR_RATING_SORT = 200;

export const metadata = {
  title: "Khám phá phim",
  description:
    "Duyệt kho phim của TheMovieDB theo thể loại, năm và điểm đánh giá, rồi tìm bản xem được trên RapPhim.",
};

export default async function DiscoverPage({ searchParams }: PageProps<"/kham-pha">) {
  const params = await searchParams;

  const query: DiscoverQuery = {
    sortBy: readSort(params.sortBy),
    genre: readText(params.genre),
    year: readNumber(params.year),
    minScore: readNumber(params.minScore),
    language: readText(params.language),
  };
  const page = Math.min(readPage(params.page), MAX_PAGE);

  const genres = await safe(api.tmdbGenres(), [] as Taxonomy[]);

  let result: PageResponse<TmdbDiscoverItem> | null = null;
  let failure: string | null = null;
  let notConfigured = false;

  try {
    result = await api.tmdbDiscover({
      page,
      sortBy: query.sortBy,
      withGenres: query.genre,
      withOriginalLanguage: query.language,
      year: query.year,
      voteAverageGte: query.minScore,
      voteCountGte:
        query.sortBy === "vote_average.desc" ? MIN_VOTES_FOR_RATING_SORT : undefined,
    });
  } catch (error) {
    notConfigured =
      error instanceof ApiRequestError && error.code === "TMDB_NOT_CONFIGURED";
    failure = errorMessage(error);
  }

  if (notConfigured) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <PageHeading title="Khám phá phim" />
        <TmdbSetupNotice />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <PageHeading title="Khám phá phim" />
        <ErrorState message={failure ?? "Không tải được dữ liệu từ TheMovieDB."} />
      </div>
    );
  }

  const { items, meta } = result;
  const genreNames = new Map(genres.map((genre) => [genre.id, genre.name]));
  const totalPages = Math.min(meta.totalPages, MAX_PAGE);

  return (
    <div className="px-4 py-5 sm:px-6">
      <PageHeading
        title="Khám phá phim"
        subtitle={`${formatCount(meta.totalItems)} phim trên TheMovieDB • trang ${meta.page}/${formatCount(totalPages)}`}
      />

      <DiscoverFilters genres={genres} query={query} />

      {items.length === 0 ? (
        <EmptyState
          title="Không có phim nào khớp bộ lọc"
          description="Thử hạ điểm tối thiểu, bỏ bớt thể loại hoặc chọn năm khác."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
            {items.map((movie, index) => (
              <DiscoverCard
                key={movie.id}
                movie={movie}
                genreNames={movie.genreIds
                  .map((id) => genreNames.get(String(id)))
                  .filter((name): name is string => Boolean(name))
                  .slice(0, 2)}
                priority={index < 6}
              />
            ))}
          </div>

          <Pagination
            page={meta.page}
            totalPages={totalPages}
            basePath="/kham-pha"
            query={{
              sortBy: query.sortBy === SORT_OPTIONS[0].value ? undefined : query.sortBy,
              genre: query.genre,
              year: query.year?.toString(),
              minScore: query.minScore?.toString(),
              language: query.language,
            }}
          />
        </>
      )}
    </div>
  );
}

/** Huong dan cau hinh, hien thay cho luoi phim khi backend chua co khoa TMDB. */
function TmdbSetupNotice() {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-8">
      <h2 className="text-lg font-medium text-fg">Chưa cấu hình TheMovieDB</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Trang này lấy dữ liệu trực tiếp từ TheMovieDB nên cần một khoá API. Lấy khoá miễn phí
        tại{" "}
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          themoviedb.org/settings/api
        </a>
        , đặt vào biến môi trường rồi khởi động lại backend:
      </p>

      <pre className="mt-4 overflow-x-auto rounded-lg bg-canvas p-4 text-xs leading-5 text-fg">
        <code>{`export TMDB_ACCESS_TOKEN="<read access token v4>"
cd backend && ./mvnw spring-boot:run`}</code>
      </pre>

      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
        Các phần khác của RapPhim không phụ thuộc vào khoá này. Việc tải file NFO cũng vẫn
        chạy bình thường vì mã TMDB và IMDb đã có sẵn trong dữ liệu của nguồn phim.
      </p>
    </div>
  );
}

function readSort(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = SORT_OPTIONS.find((option) => option.value === raw);
  return match?.value ?? SORT_OPTIONS[0].value;
}

function readText(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(value: string | string[] | undefined): number | undefined {
  const raw = readText(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}
