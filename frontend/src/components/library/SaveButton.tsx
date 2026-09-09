"use client";

import { BookmarkFilledIcon, BookmarkIcon } from "@/components/ui/icons";
import { useFavorites } from "@/lib/library";
import type { MovieDetail, MovieSummary } from "@/lib/types";

interface SaveButtonProps {
  movie: MovieSummary | MovieDetail;
  /** "icon" cho goc the phim, "pill" cho hang thao tac o trang xem phim. */
  variant?: "icon" | "pill";
  className?: string;
}

/**
 * Nut luu / bo luu mot phim.
 *
 * Hai trang thai dung chung mot cay DOM, chi khac thuoc tinh `data-saved`
 * (CSS quyet dinh icon va nhan nao hien). Nho vay HTML render tren server luon
 * giong client, `suppressHydrationWarning` chi can lo phan thuoc tinh.
 */
export function SaveButton({ movie, variant = "icon", className = "" }: SaveButtonProps) {
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(movie.slug, movie.provider);

  const base =
    variant === "pill"
      ? "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition data-[saved=false]:bg-chip data-[saved=false]:text-fg data-[saved=true]:bg-chip-active data-[saved=true]:text-chip-active-fg hover:opacity-90"
      : "grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-black/90 focus-visible:opacity-100 group-hover:opacity-100 data-[saved=true]:opacity-100";

  return (
    <button
      type="button"
      onClick={() => toggle(movie)}
      data-saved={saved ? "true" : "false"}
      aria-pressed={saved}
      aria-label="Lưu phim vào thư viện"
      title={saved ? "Bỏ lưu" : "Lưu phim"}
      suppressHydrationWarning
      className={`${base} ${className}`}
    >
      <BookmarkIcon width={18} height={18} className="save-outline" />
      <BookmarkFilledIcon width={18} height={18} className="save-filled" />
      {variant === "pill" && (
        <>
          <span className="save-outline">Lưu</span>
          <span className="save-filled">Đã lưu</span>
        </>
      )}
    </button>
  );
}
