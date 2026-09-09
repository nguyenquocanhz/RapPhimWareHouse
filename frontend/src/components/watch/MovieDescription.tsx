import { relativeTime } from "@/lib/format";
import type { MovieDetail } from "@/lib/types";

/**
 * Khoi mo ta dat duoi khung phat, dung nen xam bo goc giong
 * hop mo ta video cua YouTube.
 */
export function MovieDescription({ movie }: { movie: MovieDetail }) {
  const updated = relativeTime(movie.modifiedAt);

  return (
    <section className="mt-4 rounded-xl bg-surface p-4">
      <p className="mb-3 text-sm font-medium text-fg">
        Nội dung phim
        {updated && <span className="ml-2 font-normal text-muted">Cập nhật {updated}</span>}
      </p>

      {movie.content ? (
        <div
          className="movie-content text-sm leading-6 text-fg"
          // Mo ta tu nguon co san the HTML don gian (p, br, i...).
          dangerouslySetInnerHTML={{ __html: movie.content }}
        />
      ) : (
        <p className="text-sm text-muted">Nguồn chưa cung cấp nội dung cho phim này.</p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row label="Đạo diễn" value={movie.directors.join(", ")} />
        <Row label="Diễn viên" value={movie.actors.join(", ")} />
        <Row label="Thời lượng" value={movie.time} />
        <Row label="Số tập" value={movie.episodeTotal} />
        <Row label="Tập mới nhất" value={movie.episodeCurrent} />
        <Row label="Nguồn dữ liệu" value={movie.provider} />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{label}:</dt>
      <dd className="min-w-0 text-fg">{value}</dd>
    </div>
  );
}
