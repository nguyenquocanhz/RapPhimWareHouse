import Link from "next/link";

import type { Taxonomy } from "@/lib/types";

export interface DiscoverQuery {
  sortBy: string;
  genre?: string;
  year?: number;
  minScore?: number;
  language?: string;
}

/** Cac cach sap xep cua TMDB, dat nhan tieng Viet cho de hieu. */
export const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Phổ biến" },
  { value: "vote_average.desc", label: "Điểm cao" },
  { value: "primary_release_date.desc", label: "Mới nhất" },
  { value: "revenue.desc", label: "Doanh thu" },
] as const;

/** Ngon ngu goc thuong duoc tim nhat o thi truong Viet Nam. */
const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "ko", label: "Hàn Quốc" },
  { value: "zh", label: "Trung Quốc" },
  { value: "ja", label: "Nhật Bản" },
  { value: "th", label: "Thái Lan" },
  { value: "en", label: "Tiếng Anh" },
];

const SCORES = [9, 8, 7, 6, 5];

/**
 * Thanh loc cua trang kham pha.
 *
 * Dung form GET thuan nen chay duoc ca khi khong co JavaScript va khong can
 * component phia client. Sap xep tach rieng thanh chip vi day la thao tac
 * hay dung nhat, bam mot cai la xong.
 */
export function DiscoverFilters({
  genres,
  query,
}: {
  genres: Taxonomy[];
  query: DiscoverQuery;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, index) => currentYear - index);
  const hasFilter = Boolean(query.genre || query.year || query.minScore || query.language);

  return (
    <div className="mb-6">
      {/* Sap xep: doi bang link nen giu nguyen cac bo loc dang chon. */}
      <ul className="no-scrollbar mb-4 flex gap-3 overflow-x-auto">
        {SORT_OPTIONS.map((option) => (
          <li key={option.value} className="shrink-0">
            <Link
              href={buildHref({ ...query, sortBy: option.value })}
              aria-current={query.sortBy === option.value ? "page" : undefined}
              className={`inline-block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                query.sortBy === option.value
                  ? "bg-chip-active font-medium text-chip-active-fg"
                  : "bg-chip text-fg hover:bg-chip-hover"
              }`}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>

      <form method="get" action="/kham-pha" className="flex flex-wrap items-end gap-3">
        {/* Chi gui kem khi khac mac dinh, de URL sau khi loc con gon. */}
        {query.sortBy !== SORT_OPTIONS[0].value && (
          <input type="hidden" name="sortBy" value={query.sortBy} />
        )}

        <Field label="Thể loại" name="genre" defaultValue={query.genre ?? ""}>
          <option value="">Tất cả</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id ?? ""}>
              {genre.name}
            </option>
          ))}
        </Field>

        <Field label="Năm phát hành" name="year" defaultValue={query.year?.toString() ?? ""}>
          <option value="">Tất cả</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Field>

        <Field label="Điểm tối thiểu" name="minScore" defaultValue={query.minScore?.toString() ?? ""}>
          <option value="">Bất kỳ</option>
          {SCORES.map((score) => (
            <option key={score} value={score}>
              Từ {score} điểm
            </option>
          ))}
        </Field>

        <Field label="Ngôn ngữ gốc" name="language" defaultValue={query.language ?? ""}>
          <option value="">Tất cả</option>
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </Field>

        <button
          type="submit"
          className="h-9 rounded-full bg-chip-active px-4 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
        >
          Áp dụng
        </button>

        {hasFilter && (
          <Link
            href={buildHref({ sortBy: query.sortBy })}
            className="flex h-9 items-center rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
          >
            Xoá lọc
          </Link>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 rounded-lg border border-border bg-canvas px-3 text-sm text-fg outline-none focus:border-blue-500"
      >
        {children}
      </select>
    </label>
  );
}

/** Dung lai URL cua trang kham pha, bo qua cac gia tri rong. */
export function buildHref(query: DiscoverQuery, page?: number): string {
  const search = new URLSearchParams();
  if (query.sortBy && query.sortBy !== SORT_OPTIONS[0].value) search.set("sortBy", query.sortBy);
  if (query.genre) search.set("genre", query.genre);
  if (query.year) search.set("year", String(query.year));
  if (query.minScore) search.set("minScore", String(query.minScore));
  if (query.language) search.set("language", query.language);
  if (page && page > 1) search.set("page", String(page));

  const suffix = search.toString();
  return suffix ? `/kham-pha?${suffix}` : "/kham-pha";
}
