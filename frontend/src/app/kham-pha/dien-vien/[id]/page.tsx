import Link from "next/link";
import { notFound } from "next/navigation";

import { Thumb } from "@/components/movie/Thumb";
import { DiscoverCard } from "@/components/tmdb/DiscoverCard";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { api, safe } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/kham-pha/dien-vien/[id]">) {
  const { id } = await params;
  const person = await safe(api.tmdbPerson(id), null);
  return { title: `${person?.name ?? "Diễn viên"} | RapPhim` };
}

/**
 * Trang "phim cua dien vien": bam mot dien vien o trang chi tiet TMDB la toi day,
 * xem filmography cua ho. Moi phim dan toi trang kham pha cua no de tim ban xem duoc.
 */
export default async function Page({ params }: PageProps<"/kham-pha/dien-vien/[id]">) {
  const { id } = await params;
  const person = await safe(api.tmdbPerson(id), null);

  if (!person) {
    notFound();
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <Link
        href="/kham-pha"
        className="mb-6 inline-flex h-9 items-center gap-1 rounded-full bg-chip pl-2 pr-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
      >
        <ChevronLeftIcon width={20} height={20} />
        Khám phá
      </Link>

      <header className="flex items-center gap-4">
        <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-surface sm:w-28">
          <Thumb src={person.profileUrl} alt={person.name ?? ""} sizes="112px" priority />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-fg sm:text-3xl">{person.name}</h1>
          {person.knownForDepartment && (
            <p className="mt-1 text-sm text-muted">{person.knownForDepartment}</p>
          )}
          <p className="mt-1 text-sm text-muted">{person.films.length} phim</p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-fg">Phim đã đóng</h2>
        {person.films.length === 0 ? (
          <p className="rounded-xl bg-surface px-6 py-8 text-sm text-muted">
            Chưa có phim nào trên TheMovieDB cho diễn viên này.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
            {person.films.map((film, index) => (
              <DiscoverCard key={film.id} movie={film} genreNames={[]} priority={index < 6} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
