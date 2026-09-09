import Link from "next/link";

import { SaveButton } from "@/components/library/SaveButton";
import { Thumb } from "@/components/movie/Thumb";
import { badgeLabel, metaLine, posterOf, relativeTime, thumbOf } from "@/lib/format";
import type { MovieSummary } from "@/lib/types";

interface MovieCardProps {
  movie: MovieSummary;
  /** Nguon dang xem, gan vao link de trang chi tiet doc dung nguon. */
  provider?: string;
  /** Uu tien tai anh cho vai card dau tien de cai thien LCP. */
  priority?: boolean;
  /** Dong phu thay cho dong thoi gian cap nhat, vi du "Dang xem tap 5". */
  footnote?: string;
  /** Nut phu hien o goc duoi the, vi du nut xoa khoi thu vien. */
  action?: React.ReactNode;
}

/**
 * The phim theo bo cuc video cua YouTube: anh ngang 16:9 bo goc,
 * badge o goc duoi, ben duoi la avatar tron va khoi tieu de hai dong.
 */
export function MovieCard({
  movie,
  provider,
  priority = false,
  footnote,
  action,
}: MovieCardProps) {
  const source = provider ?? movie.provider;
  const href = source && source !== "kkphim"
    ? `/phim/${movie.slug}?provider=${source}`
    : `/phim/${movie.slug}`;

  const badge = badgeLabel(movie);
  const meta = metaLine(movie);
  const updated = footnote ?? relativeTime(movie.modifiedAt);

  return (
    <article className="group">
      {/* Link phu kin anh, nut luu nam tren link nen van bam duoc rieng. */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
        <Thumb
          src={thumbOf(movie)}
          alt={movie.name}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <Link href={href} aria-label={movie.name} className="absolute inset-0" />

        {movie.quality && (
          <span className="pointer-events-none absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5 text-[11px] font-medium text-brand-fg">
            {movie.quality}
          </span>
        )}

        <SaveButton movie={movie} className="absolute right-2 top-2" />

        {badge && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative mt-0.5 hidden size-9 shrink-0 overflow-hidden rounded-full bg-surface sm:block"
        >
          <Thumb src={posterOf(movie)} alt="" sizes="36px" />
        </Link>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2-title text-sm font-medium leading-5 text-fg">
            <Link href={href} className="hover:text-fg">
              {movie.name}
            </Link>
          </h3>

          {movie.originName && (
            <p className="mt-1 truncate text-xs text-muted">{movie.originName}</p>
          )}

          <p className="mt-0.5 truncate text-xs text-muted">
            {meta}
            {meta && updated ? " • " : ""}
            {updated}
          </p>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </article>
  );
}
