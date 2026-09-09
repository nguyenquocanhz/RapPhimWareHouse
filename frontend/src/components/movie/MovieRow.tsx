import Link from "next/link";

import { Thumb } from "@/components/movie/Thumb";
import { badgeLabel, metaLine, relativeTime, stripHtml, thumbOf, typeLabel } from "@/lib/format";
import type { MovieSummary } from "@/lib/types";

interface MovieRowProps {
  movie: MovieSummary;
  provider?: string;
  /** Doan mo ta ngan hien ben phai, neu nguon co tra ve. */
  description?: string | null;
}

/**
 * Hang ket qua nam ngang: anh lon ben trai, thong tin ben phai -
 * dung cho trang tim kiem, giong ket qua tim kiem cua YouTube.
 */
export function MovieRow({ movie, provider, description }: MovieRowProps) {
  const href = provider && provider !== "kkphim"
    ? `/phim/${movie.slug}?provider=${provider}`
    : `/phim/${movie.slug}`;

  const badge = badgeLabel(movie);
  const summary = stripHtml(description);

  return (
    <article className="group flex flex-col gap-3 sm:flex-row sm:gap-4">
      <Link
        href={href}
        className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-surface sm:w-64 lg:w-90"
      >
        <Thumb
          src={thumbOf(movie)}
          alt={movie.name}
          sizes="(max-width: 640px) 100vw, 360px"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {badge && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {badge}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2-title text-base font-medium leading-6 text-fg sm:text-lg">
          <Link href={href}>{movie.name}</Link>
        </h3>

        <p className="mt-1 text-xs text-muted">
          {[metaLine(movie), typeLabel(movie.type), relativeTime(movie.modifiedAt)]
            .filter(Boolean)
            .join(" • ")}
        </p>

        {movie.originName && (
          <p className="mt-2 truncate text-sm text-muted">{movie.originName}</p>
        )}

        {summary && (
          <p className="mt-2 line-clamp-2-title text-sm leading-5 text-muted">{summary}</p>
        )}

        {movie.categories.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {movie.categories.slice(0, 4).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/the-loai/${category.slug}`}
                  className="inline-block rounded-lg bg-chip px-2 py-1 text-xs text-fg transition hover:bg-chip-hover"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
