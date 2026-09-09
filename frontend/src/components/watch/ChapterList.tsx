"use client";

import { useState } from "react";

import { CloseIcon, PlayIcon, TagIcon, TrashIcon } from "@/components/ui/icons";
import type { Chapter } from "@/lib/library";
import type { ChapterThumbs } from "@/components/watch/useChapterThumbs";
import type { SceneSplit } from "@/components/watch/useSceneSplit";

/**
 * Danh sach chuong cua tap dang xem.
 *
 * Ca KKPhim lan NguonC deu khong tra ve moc chuong nen day la du lieu nguoi xem tu
 * danh dau, luu trong trinh duyet giong moc gioi thieu. Dat ngay duoi khung phat de
 * vua xem vua them, khong phai mo hop thoai nao.
 *
 * Nguon cung khong co phu de de doc ra noi dung - phu de chay thang vao hinh - nen
 * khong the tu dat ten chuong. Thay vao do moi dong hien anh khung hinh ngay tai giay
 * do va o ten go duoc tai cho: nhin anh la biet doan do dien gi de dat ten.
 */

interface ChapterListProps {
  chapters: Chapter[];
  /** Anh khung hinh theo giay; giay nao chua co anh thi dong do hien o cho. */
  thumbs: ChapterThumbs;
  /**
   * Doc giay dang phat ngay luc bam.
   *
   * Co y khong nhan qua prop: vi tri doi vai lan mot giay, dua vao prop se lam ca
   * trang xem phim render lai lien tuc chi de doi mot dong chu tren nut.
   */
  getCurrentTime: () => number;
  /** Thoi luong tap, 0 nghia la chua doc duoc - luc do chua cho them chuong. */
  duration: number;
  onAdd: (at: number, title: string) => void;
  onRename: (at: number, title: string) => void;
  onRemove: (at: number) => void;
  onSeek: (at: number) => void;
  onClearAll: () => void;
  /** Lan tu chia theo canh gan nhat. */
  split: SceneSplit;
}

export function ChapterList({
  chapters,
  thumbs,
  getCurrentTime,
  duration,
  onAdd,
  onRename,
  onRemove,
  onSeek,
  onClearAll,
  split,
}: ChapterListProps) {
  // Giay duoc chot ngay luc bam "Them chuong": phim van chay trong luc go ten,
  // khong chot lai thi chuong se roi vao cho khac han.
  const [draft, setDraft] = useState<{ at: number; title: string } | null>(null);

  // Chu dang go cua tung dong. Chi ghi xuong kho luu khi roi o hoac bam Enter: ghi
  // theo tung phim se viet lai ca cum chuong sau moi ky tu.
  const [typing, setTyping] = useState<Record<number, string>>({});

  const canAdd = duration > 0;

  function submitDraft() {
    if (!draft || !draft.title.trim()) return;
    onAdd(draft.at, draft.title);
    setDraft(null);
  }

  function forget(at: number) {
    setTyping((current) => {
      const next = { ...current };
      delete next[at];
      return next;
    });
  }

  function commit(at: number, current: string) {
    const value = typing[at];
    forget(at);
    if (value === undefined) return;

    const name = value.trim();
    if (!name || name === current) return;
    onRename(at, name);
  }

  return (
    <section className="mt-4 rounded-xl border border-border">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-fg">
          <TagIcon width={18} height={18} />
          Chương
          {chapters.length > 0 && (
            <span className="font-normal text-muted">{chapters.length} mốc</span>
          )}
        </h2>

        {canAdd && !draft && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={split.run}
              disabled={split.status === "working"}
              title="Đọc danh sách phát của nguồn để tìm các chỗ chuyển cảnh, không phải tải phim về"
              className="rounded-full bg-chip px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-chip-hover disabled:opacity-50"
            >
              {split.status === "working" ? "Đang chia…" : "Tự chia theo cảnh"}
            </button>

            <button
              type="button"
              onClick={() => setDraft({ at: Math.round(getCurrentTime()), title: "" })}
              className="rounded-full bg-chip px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-chip-hover"
            >
              Thêm tại vị trí đang xem
            </button>

            {chapters.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-fg"
              >
                Xoá tất cả
              </button>
            )}
          </div>
        )}
      </header>

      {(split.status === "error" || split.status === "done") && (
        <p className="border-b border-border px-4 py-2 text-xs text-muted">
          {split.status === "error"
            ? split.error
            : split.found === 0
              ? "Không tìm được chỗ chuyển cảnh nào đủ tách bạch."
              : split.fromRealCuts
                ? `Đã đặt ${split.found} mốc vào các chỗ chuyển cảnh. Nhìn ảnh rồi gõ tên cho từng mốc.`
                : `Nguồn này cắt đoạn đều nhau nên không đoán được chỗ chuyển cảnh; ${split.found} mốc dưới đây chỉ là chia đều.`}
        </p>
      )}

      {draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitDraft();
          }}
          className="flex items-center gap-2 border-b border-border px-3 py-2"
        >
          <span className="shrink-0 rounded bg-chip px-2 py-1 text-xs font-medium tabular-nums text-fg">
            {formatTime(draft.at)}
          </span>

          <input
            autoFocus
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDraft(null);
            }}
            placeholder="Tên chương, ví dụ: Bắt đầu vụ án"
            maxLength={80}
            className="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-fg/40"
          />

          <button
            type="submit"
            disabled={!draft.title.trim()}
            className="shrink-0 rounded-full bg-chip-active px-3 py-1.5 text-xs font-medium text-chip-active-fg transition hover:opacity-90 disabled:opacity-40"
          >
            Lưu
          </button>

          <button
            type="button"
            onClick={() => setDraft(null)}
            aria-label="Huỷ"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </form>
      )}

      {chapters.length === 0 && !draft ? (
        <p className="px-4 py-5 text-sm text-muted">
          {canAdd
            ? "Chưa có chương nào. Bấm Tự chia theo cảnh để đặt sẵn các mốc, hoặc dừng ở đoạn muốn đánh dấu rồi bấm Thêm."
            : "Đợi tập phim tải xong rồi mới đánh dấu chương được."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {chapters.map((chapter) => (
            <li key={chapter.at} className="group flex items-center gap-3 px-3 py-2">
              <button
                type="button"
                onClick={() => onSeek(chapter.at)}
                aria-label={`Nhảy tới ${formatTime(chapter.at)}`}
                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-surface transition hover:opacity-80"
              >
                {thumbs[chapter.at] ? (
                  // Anh duoc ve tu canvas ngay trong trinh duyet nen khong di qua bo
                  // toi uu anh cua Next duoc, phai dung the <img> thuong.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbs[chapter.at]}
                    alt=""
                    draggable={false}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="skeleton absolute inset-0" />
                )}

                <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon width={20} height={20} className="text-white drop-shadow" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSeek(chapter.at)}
                className="shrink-0 rounded bg-chip px-2 py-1 text-xs font-medium tabular-nums text-fg transition hover:bg-chip-hover"
              >
                {formatTime(chapter.at)}
              </button>

              <input
                value={typing[chapter.at] ?? chapter.title}
                onChange={(event) =>
                  setTyping((current) => ({ ...current, [chapter.at]: event.target.value }))
                }
                onBlur={() => commit(chapter.at, chapter.title)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    forget(chapter.at);
                  }
                }}
                maxLength={80}
                aria-label={`Tên chương tại ${formatTime(chapter.at)}`}
                placeholder="Đặt tên cho đoạn này"
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-fg outline-none transition placeholder:text-muted hover:border-border focus:border-fg/40 focus:bg-canvas"
              />

              <button
                type="button"
                onClick={() => onRemove(chapter.at)}
                aria-label={`Xoá chương ${chapter.title}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg"
              >
                <TrashIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 65 giay thanh "1:05", 3725 giay thanh "1:02:05". */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  return hours > 0
    ? `${hours}:${mm}:${String(secs).padStart(2, "0")}`
    : `${mm}:${String(secs).padStart(2, "0")}`;
}
