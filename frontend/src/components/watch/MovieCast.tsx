import Link from "next/link";

import { Thumb } from "@/components/movie/Thumb";
import type { TmdbCast } from "@/lib/types";

/**
 * Danh sach dien vien hien ngay duoi phim tren trang xem.
 *
 * <p>Uu tien dan dien vien tu TheMovieDB: co anh va co ma nguoi, bam vao la sang trang
 * cac phim dien vien do da dong (giong trang Kham pha). Khi phim khong khop TMDB thi
 * do ve ten dien vien tho tu nguon - chi hien ten, khong bam duoc vi khong co ma.</p>
 */
export function MovieCast({ cast, actors }: { cast: TmdbCast[]; actors: string[] }) {
  if (cast.length === 0 && actors.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-fg">Diễn viên</h2>

      {cast.length > 0 ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {cast.map((member, index) => {
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
      ) : (
        // Khong co du lieu TMDB: chi con ten tho tu nguon, khong bam tim theo được.
        <ul className="flex flex-wrap gap-2">
          {actors.map((name) => (
            <li key={name} className="rounded-lg bg-chip px-3 py-1.5 text-sm text-fg">
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
