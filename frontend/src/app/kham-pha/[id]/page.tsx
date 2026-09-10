import Link from "next/link";
import { notFound } from "next/navigation";

import { MovieCard } from "@/components/movie/MovieCard";
import { Thumb } from "@/components/movie/Thumb";
import { ChevronLeftIcon, SearchIcon } from "@/components/ui/icons";
import { ErrorState } from "@/components/ui/States";
import { api, ApiRequestError, blockedHint, errorMessage, isUnreachable, safe } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { MovieSummary, TmdbDetail } from "@/lib/types";

/** So ban ghi tim thu tren hai nguon de goi y cho nguoi dung. */
const MATCH_LIMIT = 8;

export async function generateMetadata({ params }: PageProps<"/kham-pha/[id]">) {
  const { id } = await params;
  const movie = await safe(api.tmdbMovie(id), null);

  if (!movie) {
    return { title: "Không tìm thấy phim trên TMDB" };
  }

  return {
    title: movie.title ?? movie.originalTitle ?? `TMDB ${id}`,
    description: movie.overview?.slice(0, 180) || undefined,
    openGraph: {
      title: movie.title ?? undefined,
      images: movie.posterUrl ? [movie.posterUrl] : undefined,
    },
  };
}

export default async function TmdbMoviePage({ params, searchParams }: PageProps<"/kham-pha/[id]">) {
  const { id } = await params;
  const search = await searchParams;
  const type = readType(search.type);

  let movie: TmdbDetail | null = null;
  let failure: string | null = null;
  let hint: string | undefined;
  let unreachable = false;
  let missing = false;

  try {
    movie = await api.tmdbMovie(id, type);
  } catch (error) {
    missing = error instanceof ApiRequestError && error.isNotFound;
    failure = errorMessage(error);
    unreachable = isUnreachable(error);
    hint = blockedHint(error);
  }

  if (missing) {
    notFound();
  }

  if (!movie) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <ErrorState
          message={failure ?? "Không tải được dữ liệu từ TheMovieDB."}
          unreachable={unreachable}
          hint={hint}
        />
      </div>
    );
  }

  const title = movie.title ?? movie.originalTitle ?? `TMDB ${id}`;
  const keyword = movie.originalTitle ?? title;

  // Doi chieu sang hai nguon co link xem. Loi o buoc nay khong duoc lam hong trang.
  const matches = await safe(
    api.search(keyword, { limit: MATCH_LIMIT }).then((page) => page.items),
    [] as MovieSummary[],
  );

  return (
    <div>
      <Hero movie={movie} title={title} keyword={keyword} />

      <div className="px-4 pb-8 sm:px-6">
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-semibold text-fg">Xem bản có sẵn trên RapPhim</h2>
          <p className="mb-4 text-sm text-muted">
            TheMovieDB chỉ có thông tin phim, không có link xem. Dưới đây là kết quả tìm
            {" "}
            <span className="text-fg">&ldquo;{keyword}&rdquo;</span> trên hai nguồn của RapPhim.
          </p>

          {matches.length === 0 ? (
            <div className="rounded-xl bg-surface px-6 py-8 text-sm text-muted">
              Không tìm thấy bản nào khớp tên gốc. Thử{" "}
              <Link
                href={`/tim-kiem?keyword=${encodeURIComponent(title)}`}
                className="text-fg underline"
              >
                tìm theo tên tiếng Việt
              </Link>{" "}
              hoặc rút ngắn từ khoá.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {matches.map((match, index) => (
                <MovieCard
                  key={`${match.provider}-${match.slug}`}
                  movie={match}
                  priority={index < 2}
                />
              ))}
            </div>
          )}
        </section>

        {movie.cast.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-fg">Diễn viên</h2>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {movie.cast.map((member, index) => {
                const card = (
                  <>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-brand transition group-hover:ring-2">
                      <Thumb src={member.profileUrl} alt={member.name ?? ""} sizes="112px" />
                    </div>
                    <p className="mt-2 line-clamp-2-title text-xs font-medium leading-4 text-fg group-hover:text-brand">
                      {member.name}
                    </p>
                    {member.character && (
                      <p className="mt-0.5 line-clamp-2-title text-xs leading-4 text-muted">
                        {member.character}
                      </p>
                    )}
                  </>
                );
                return (
                  <li key={`${member.name}-${index}`}>
                    {member.id ? (
                      <Link
                        href={`/kham-pha/dien-vien/${member.id}`}
                        className="group block"
                        title={`Phim ${member.name} đã đóng`}
                      >
                        {card}
                      </Link>
                    ) : (
                      card
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** Khoi dau trang: anh nen ngang, poster doc va thong tin chinh. */
function Hero({
  movie,
  title,
  keyword,
}: {
  movie: TmdbDetail;
  title: string;
  keyword: string;
}) {
  const year = movie.releaseDate?.slice(0, 4);

  const facts = [
    year,
    movie.runtime ? `${movie.runtime} phút` : null,
    movie.numberOfSeasons ? `${movie.numberOfSeasons} mùa` : null,
    movie.numberOfEpisodes ? `${movie.numberOfEpisodes} tập` : null,
    movie.status,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="relative">
      {/* Anh nen mo dan xuong duoi de chu ben tren van doc duoc. */}
      {movie.backdropUrl && (
        <div className="absolute inset-x-0 top-0 h-72 overflow-hidden sm:h-96">
          <Thumb src={movie.backdropUrl} alt="" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/85 to-canvas/40" />
        </div>
      )}

      <div className="relative px-4 pt-5 sm:px-6">
        <Link
          href="/kham-pha"
          className="mb-4 inline-flex h-9 items-center gap-1 rounded-full bg-chip pl-2 pr-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
        >
          <ChevronLeftIcon width={20} height={20} />
          Khám phá
        </Link>

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl bg-surface sm:w-56">
            <Thumb src={movie.posterUrl} alt={title} sizes="224px" priority />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-8 text-fg sm:text-3xl">{title}</h1>

            {movie.originalTitle && movie.originalTitle !== title && (
              <p className="mt-1 text-sm text-muted">{movie.originalTitle}</p>
            )}

            {movie.tagline && (
              <p className="mt-2 text-sm italic text-muted">{movie.tagline}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {movie.voteAverage !== null && movie.voteAverage > 0 && (
                <span className="flex items-center gap-2 rounded-full bg-chip px-3 py-1.5 text-sm font-medium text-fg">
                  <span className="grid size-7 place-items-center rounded-full bg-brand text-xs text-brand-fg">
                    {movie.voteAverage.toFixed(1)}
                  </span>
                  {formatCount(movie.voteCount ?? 0)} đánh giá
                </span>
              )}

              <Link
                href={`/tim-kiem?keyword=${encodeURIComponent(keyword)}`}
                className="flex h-9 items-center gap-2 rounded-full bg-chip-active px-4 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
              >
                <SearchIcon width={18} height={18} />
                Tìm để xem
              </Link>

              {movie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
                >
                  IMDb
                </a>
              )}
            </div>

            {facts.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {facts.map((fact) => (
                  <li
                    key={fact}
                    className="rounded-lg bg-chip px-3 py-1.5 text-xs font-medium text-fg"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            )}

            {movie.genres.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                <span className="text-fg">Thể loại:</span> {movie.genres.join(", ")}
              </p>
            )}

            {movie.overview && (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-fg">{movie.overview}</p>
            )}

            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Fact label="Đạo diễn" value={movie.directors.join(", ")} />
              <Fact label="Hãng sản xuất" value={movie.studios.join(", ")} />
              <Fact label="Quốc gia" value={movie.countries.join(", ")} />
              <Fact label="Ngày phát hành" value={movie.releaseDate} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{label}:</dt>
      <dd className="min-w-0 text-fg">{value}</dd>
    </div>
  );
}

function readType(value: string | string[] | undefined): "movie" | "tv" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "tv" ? "tv" : "movie";
}
