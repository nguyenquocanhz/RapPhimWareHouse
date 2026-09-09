import Link from "next/link";

import { Thumb } from "@/components/movie/Thumb";
import { PlayIcon } from "@/components/ui/icons";
import type { TmdbDiscoverItem } from "@/lib/types";

interface DiscoverCardProps {
  movie: TmdbDiscoverItem;
  /** Ten the loai tra cuu tu genreIds. */
  genreNames: string[];
  priority?: boolean;
}

/**
 * The phim cua TMDB: poster doc 2:3 kem diem so, dung de xem truoc.
 *
 * Bam vao the se sang trang chi tiet TMDB, o do co day du thong tin va
 * danh sach ban xem duoc doi chieu tu hai nguon cua RapPhim.
 */
export function DiscoverCard({ movie, genreNames, priority = false }: DiscoverCardProps) {
  const title = movie.title ?? movie.originalTitle ?? "Không rõ tên";
  const year = movie.releaseDate?.slice(0, 4);
  const href = `/kham-pha/${movie.id}`;

  return (
    <article className="group">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface">
        <Thumb
          src={movie.posterUrl}
          alt={title}
          priority={priority}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, (max-width: 1536px) 20vw, 15vw"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <Link href={href} aria-label={`Xem thông tin "${title}"`} className="absolute inset-0" />

        {movie.voteAverage !== null && movie.voteAverage > 0 && (
          <span
            className="pointer-events-none absolute bottom-2 left-2 grid size-9 place-items-center rounded-full bg-black/85 text-xs font-semibold text-white"
            title={`${movie.voteCount ?? 0} lượt đánh giá trên TMDB`}
          >
            {movie.voteAverage.toFixed(1)}
          </span>
        )}

        {/* Nhac lai rang the nay chi de xem truoc, muon xem thi bam de tim. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-black/85 py-2 text-[11px] font-medium text-white transition-transform duration-200 group-hover:translate-y-0">
          <PlayIcon width={14} height={14} />
          Xem thông tin
        </span>
      </div>

      <h3 className="line-clamp-2-title mt-2 text-sm font-medium leading-5 text-fg">
        <Link href={href}>{title}</Link>
      </h3>

      <p className="mt-0.5 truncate text-xs text-muted">
        {[movie.originalTitle !== title ? movie.originalTitle : null, year]
          .filter(Boolean)
          .join(" • ")}
      </p>

      {genreNames.length > 0 && (
        <p className="mt-0.5 truncate text-xs text-muted">{genreNames.join(", ")}</p>
      )}
    </article>
  );
}

/** Khung xuong cua luoi poster, hien khi dang cho TMDB phan hoi. */
export function DiscoverGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="skeleton aspect-[2/3] rounded-xl" />
          <div className="skeleton mt-2 h-4 w-4/5 rounded" />
          <div className="skeleton mt-1 h-3 w-3/5 rounded" />
        </div>
      ))}
    </div>
  );
}
