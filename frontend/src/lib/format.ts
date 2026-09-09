import type { MovieSummary } from "@/lib/types";

/** Nhan hien thi cho tung loai phim tra ve tu API. */
const TYPE_LABELS: Record<string, string> = {
  single: "Phim lẻ",
  series: "Phim bộ",
  tvshows: "TV Show",
  hoathinh: "Hoạt hình",
};

/** Nhan hien thi cho trang thai phat song. */
const STATUS_LABELS: Record<string, string> = {
  ongoing: "Đang chiếu",
  completed: "Hoàn tất",
  trailer: "Sắp chiếu",
};

export function typeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return TYPE_LABELS[type] ?? type;
}

export function statusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  return STATUS_LABELS[status] ?? status;
}

/**
 * Nhan ngan dat o goc thumbnail, giong badge thoi luong cua YouTube.
 * Uu tien so tap dang co, neu khong co thi dung thoi luong.
 */
export function badgeLabel(movie: Pick<MovieSummary, "episodeCurrent" | "time" | "type">): string | null {
  const episode = movie.episodeCurrent?.trim();
  if (episode && episode.toLowerCase() !== "full") {
    return episode;
  }
  if (episode?.toLowerCase() === "full") {
    return movie.time?.trim() || "Full";
  }
  return movie.time?.trim() || null;
}

/** Chuoi meta dong thu hai cua card: nam, chat luong, ngon ngu. */
export function metaLine(movie: Pick<MovieSummary, "year" | "quality" | "lang">): string {
  return [movie.year, movie.quality, movie.lang].filter(Boolean).join(" • ");
}

/**
 * Doi moc thoi gian ISO thanh dang "3 giờ trước" quen thuoc voi nguoi dung YouTube.
 */
export function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;

  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return "vừa xong";

  const units: Array<[number, string]> = [
    [60, "phút"],
    [3600, "giờ"],
    [86400, "ngày"],
    [604800, "tuần"],
    [2592000, "tháng"],
    [31536000, "năm"],
  ];

  let label = "năm";
  let value = Math.floor(seconds / 31536000);
  for (let i = 0; i < units.length; i += 1) {
    const [step, name] = units[i];
    const next = units[i + 1];
    if (!next || seconds < next[0]) {
      value = Math.floor(seconds / step);
      label = name;
      break;
    }
  }
  return `${Math.max(value, 1)} ${label} trước`;
}

/**
 * Nhan diem danh gia, vi du "TMDB 7.4". Tra null khi nguon chua cham diem
 * (rat nhieu phim co voteAverage bang 0) de khong hien sao rong gay hieu nham.
 */
export function ratingLabel(
  source: "TMDB" | "IMDb",
  ref: { voteAverage: number | null } | null | undefined,
): string | null {
  const score = ref?.voteAverage;
  if (!score || score <= 0) return null;
  return `${source} ${score.toFixed(1)}`;
}

/** Rut gon so luot / so phim: 29966 -> "29.966". */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** Bo the HTML khoi mo ta de dung cho doan tom tat ngan. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Anh dai dien uu tien anh ngang cho card kieu YouTube. */
export function thumbOf(movie: Pick<MovieSummary, "thumbUrl" | "posterUrl">): string | null {
  return movie.thumbUrl || movie.posterUrl || null;
}

/** Anh doc dung cho phan hero cua trang chi tiet. */
export function posterOf(movie: Pick<MovieSummary, "thumbUrl" | "posterUrl">): string | null {
  return movie.posterUrl || movie.thumbUrl || null;
}
