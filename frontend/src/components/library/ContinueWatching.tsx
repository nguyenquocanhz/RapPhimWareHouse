"use client";

import Link from "next/link";

import { Thumb } from "@/components/movie/Thumb";
import { ChevronRightIcon, PlayIcon, TrashIcon } from "@/components/ui/icons";
import { thumbOf } from "@/lib/format";
import { toSummary, useWatchHistory, type HistoryEntry } from "@/lib/library";

/**
 * Dai "Tiep tuc xem" dat ngay dau trang chu, giong ke goi y cua YouTube.
 * Tu an di khi chua xem phim nao nen khong lam trong trang cua nguoi dung moi.
 */
export function ContinueWatching({ limit = 12 }: { limit?: number }) {
  const { history, remove } = useWatchHistory();

  if (history.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg sm:text-lg">Tiếp tục xem</h2>
        <Link
          href="/dang-xem"
          className="flex items-center gap-1 rounded-full bg-chip px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-chip-hover"
        >
          Xem tất cả
          <ChevronRightIcon width={16} height={16} />
        </Link>
      </div>

      <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {history.slice(0, limit).map((entry) => (
          <li key={`${entry.provider}:${entry.slug}`} className="w-64 shrink-0 snap-start">
            <ContinueCard entry={entry} onRemove={() => remove(entry.slug, entry.provider)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContinueCard({ entry, onRemove }: { entry: HistoryEntry; onRemove: () => void }) {
  const href =
    entry.provider === "kkphim"
      ? `/phim/${entry.slug}`
      : `/phim/${entry.slug}?provider=${entry.provider}`;

  return (
    <article className="group">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
        <Thumb
          src={thumbOf(toSummary(entry))}
          alt={entry.name}
          sizes="256px"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <Link href={href} aria-label={`Xem tiếp ${entry.name}`} className="absolute inset-0" />

        {/* Lop phu nhac lai day la phim dang xem do. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-6 text-[11px] font-medium text-white">
          <PlayIcon width={14} height={14} />
          {entry.episodeName ?? "Xem tiếp"}
        </span>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Xoá ${entry.name} khỏi lịch sử`}
          title="Xoá khỏi lịch sử"
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-black/90 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <TrashIcon width={18} height={18} />
        </button>
      </div>

      <h3 className="line-clamp-2-title mt-2 text-sm font-medium leading-5 text-fg">
        <Link href={href}>{entry.name}</Link>
      </h3>
    </article>
  );
}
