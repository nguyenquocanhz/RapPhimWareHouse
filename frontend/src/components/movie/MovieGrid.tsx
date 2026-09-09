import { MovieCard } from "@/components/movie/MovieCard";
import type { MovieSummary } from "@/lib/types";

interface MovieGridProps {
  movies: MovieSummary[];
  provider?: string;
}

/**
 * Luoi phim co so cot tu gian theo be ngang man hinh,
 * dung khoang cach thoang giong trang chu YouTube.
 */
export function MovieGrid({ movies, provider }: MovieGridProps) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
      {movies.map((movie, index) => (
        <MovieCard
          key={`${movie.provider}-${movie.slug}-${index}`}
          movie={movie}
          provider={provider}
          priority={index < 4}
        />
      ))}
    </div>
  );
}

/** Khung xuong hien khi du lieu dang duoc tai. */
export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="skeleton aspect-video rounded-xl" />
          <div className="mt-3 flex gap-3">
            <div className="skeleton hidden size-9 shrink-0 rounded-full sm:block" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-4/5 rounded" />
              <div className="skeleton h-3 w-3/5 rounded" />
              <div className="skeleton h-3 w-2/5 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
