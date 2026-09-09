import Link from "next/link";

import { Thumb } from "@/components/movie/Thumb";
import { badgeLabel, metaLine, thumbOf } from "@/lib/format";
import type { MovieSummary } from "@/lib/types";

interface RelatedMoviesProps {
  movies: MovieSummary[];
  /** Nhan mo ta nguon goi y, vi du "Cung the loai Hanh Dong". */
  reason?: string;
}

/**
 * Cot goi y ben phai trang xem phim: hang ngang anh nho - tieu de,
 * dung vai tro nhu danh sach "tiep theo" cua YouTube.
 */
export function RelatedMovies({ movies, reason }: RelatedMoviesProps) {
  if (movies.length === 0) {
    return null;
  }

  return (
    <section className="mt-4">
      <h2 className="mb-3 text-sm font-medium text-fg">
        Phim liên quan
        {reason && <span className="ml-2 font-normal text-muted">{reason}</span>}
      </h2>

      <ul className="flex flex-col gap-3">
        {movies.map((movie) => (
          <li key={`${movie.provider}-${movie.slug}`}>
            <RelatedRow movie={movie} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedRow({ movie }: { movie: MovieSummary }) {
  const href =
    movie.provider === "kkphim"
      ? `/phim/${movie.slug}`
      : `/phim/${movie.slug}?provider=${movie.provider}`;

  const badge = badgeLabel(movie);

  return (
    <article className="group flex gap-2">
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-surface">
        <Thumb
          src={thumbOf(movie)}
          alt={movie.name}
          sizes="160px"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <Link href={href} aria-label={movie.name} className="absolute inset-0" />
        {badge && (
          <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2-title text-xs font-medium leading-4 text-fg">
          <Link href={href}>{movie.name}</Link>
        </h3>
        <p className="mt-1 truncate text-[11px] text-muted">{movie.originName}</p>
        <p className="truncate text-[11px] text-muted">{metaLine(movie)}</p>
      </div>
    </article>
  );
}
