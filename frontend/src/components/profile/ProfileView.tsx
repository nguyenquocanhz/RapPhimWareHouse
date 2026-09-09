"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";

import { MovieCard } from "@/components/movie/MovieCard";
import {
  BookmarkIcon,
  CheckIcon,
  ChevronRightIcon,
  HistoryIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { relativeTime } from "@/lib/format";
import {
  toSummary,
  useFavorites,
  useRecentSearches,
  useWatchHistory,
  type FavoriteEntry,
  type HistoryEntry,
  type SearchEntry,
} from "@/lib/library";
import {
  AVATAR_COLORS,
  avatarClass,
  initialOf,
  useProfile,
  type AvatarColorId,
} from "@/lib/profile";

/** So the phim hien o moi hang tom tat. */
const PREVIEW_COUNT = 4;

interface ExportBundle {
  version: 1;
  exportedAt: string;
  profile: { name: string; color: AvatarColorId };
  favorites: FavoriteEntry[];
  history: HistoryEntry[];
  searches: SearchEntry[];
}

/**
 * Trang ho so ca nhan: ten hien thi, mau dai dien, thong ke thu vien
 * va cong cu quan ly du lieu.
 *
 * Khong co dang nhap nen day la ho so cuc bo cua tung trinh duyet. Muc
 * "Quan ly du lieu" ton tai chinh vi le do: nguoi dung tu mang du lieu
 * sang may khac bang file JSON.
 */
export function ProfileView() {
  const { profile, update } = useProfile();
  const { favorites, clear: clearFavorites } = useFavorites();
  const { history, clear: clearHistory } = useWatchHistory();
  const { searches, clear: clearSearches } = useRecentSearches();

  return (
    <div className="px-4 py-5 sm:px-6">
      <ProfileHeader
        name={profile.name}
        color={profile.color}
        createdAt={profile.createdAt}
        onChange={update}
      />

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={<BookmarkIcon />} label="Phim đã lưu" value={favorites.length} href="/da-luu" />
        <Stat icon={<HistoryIcon />} label="Đang xem" value={history.length} href="/dang-xem" />
        <Stat
          icon={<SearchIcon />}
          label="Từ khoá đã tìm"
          value={searches.length}
          href="/lich-su-tim-kiem"
        />
      </section>

      <MovieRowSection
        title="Tiếp tục xem"
        href="/dang-xem"
        empty="Chưa xem phim nào. Mở một bộ phim bất kỳ, RapPhim sẽ nhớ tập đang xem dở."
        entries={history.slice(0, PREVIEW_COUNT).map((entry) => ({
          key: `${entry.provider}:${entry.slug}`,
          movie: toSummary(entry),
          footnote: entry.episodeName ? `Đang xem ${entry.episodeName}` : undefined,
        }))}
      />

      <MovieRowSection
        title="Phim đã lưu"
        href="/da-luu"
        empty="Chưa lưu phim nào. Bấm dấu trang ở góc ảnh phim để lưu lại xem sau."
        entries={favorites.slice(0, PREVIEW_COUNT).map((entry) => ({
          key: `${entry.provider}:${entry.slug}`,
          movie: toSummary(entry),
          footnote: relativeTime(new Date(entry.savedAt).toISOString()) ?? undefined,
        }))}
      />

      <DataSection
        bundle={{
          version: 1,
          exportedAt: new Date().toISOString(),
          profile: { name: profile.name, color: profile.color },
          favorites,
          history,
          searches,
        }}
        onClearAll={() => {
          clearFavorites();
          clearHistory();
          clearSearches();
        }}
      />
    </div>
  );
}

function ProfileHeader({
  name,
  color,
  createdAt,
  onChange,
}: {
  name: string;
  color: AvatarColorId;
  createdAt: number;
  onChange: (changes: { name?: string; color?: AvatarColorId }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function save() {
    const value = draft.trim();
    if (value) {
      onChange({ name: value });
    }
    setEditing(false);
  }

  return (
    <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className={`grid size-24 shrink-0 place-items-center rounded-full text-4xl font-semibold ${avatarClass(color)}`}
        suppressHydrationWarning
      >
        {initialOf(name)}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
                if (event.key === "Escape") setEditing(false);
              }}
              maxLength={40}
              aria-label="Tên hiển thị"
              className="h-10 rounded-lg border border-border bg-canvas px-3 text-lg text-fg outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={save}
              className="flex h-10 items-center gap-2 rounded-full bg-chip-active px-4 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
            >
              <CheckIcon width={18} height={18} />
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-10 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
            >
              Huỷ
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-fg sm:text-3xl" suppressHydrationWarning>
              {name}
            </h1>
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="h-9 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
            >
              Đổi tên
            </button>
          </div>
        )}

        <p className="mt-2 text-sm text-muted" suppressHydrationWarning>
          {createdAt
            ? `Hồ sơ tạo ${relativeTime(new Date(createdAt).toISOString()) ?? "gần đây"}`
            : "Hồ sơ cục bộ, chỉ lưu trên trình duyệt này"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Màu đại diện:</span>
          {AVATAR_COLORS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ color: option.id })}
              aria-label={`Màu ${option.label}`}
              aria-pressed={option.id === color}
              suppressHydrationWarning
              className={`size-7 rounded-full transition ${option.className} ${
                option.id === color ? "ring-2 ring-fg ring-offset-2 ring-offset-canvas" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-muted">{icon}</span>
      <span className="mt-2 text-2xl font-semibold text-fg" suppressHydrationWarning>
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </>
  );

  const className =
    "flex flex-col items-start rounded-xl bg-surface px-4 py-4 transition hover:bg-surface-hover";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function MovieRowSection({
  title,
  href,
  empty,
  entries,
}: {
  title: string;
  href: string;
  empty: string;
  entries: Array<{ key: string; movie: ReturnType<typeof toSummary>; footnote?: string }>;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {entries.length > 0 && (
          <Link
            href={href}
            className="flex items-center gap-1 rounded-full bg-chip px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-chip-hover"
          >
            Xem tất cả
            <ChevronRightIcon width={16} height={16} />
          </Link>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl bg-surface px-6 py-8 text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {entries.map((entry) => (
            <MovieCard key={entry.key} movie={entry.movie} footnote={entry.footnote} />
          ))}
        </div>
      )}
    </section>
  );
}

function DataSection({
  bundle,
  onClearAll,
}: {
  bundle: ExportBundle;
  onClearAll: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function exportJson() {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapphim-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Đã tải file dữ liệu về máy.");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as Partial<ExportBundle>;

      // Ghi thang vao localStorage roi tai lai: don gian va chac chan hon
      // viec ghep tung store, vi moi store deu tu doc lai khi trang mo lai.
      if (Array.isArray(parsed.favorites)) {
        localStorage.setItem("rapphim.favorites", JSON.stringify(parsed.favorites));
      }
      if (Array.isArray(parsed.history)) {
        localStorage.setItem("rapphim.history", JSON.stringify(parsed.history));
      }
      if (Array.isArray(parsed.searches)) {
        localStorage.setItem("rapphim.searches", JSON.stringify(parsed.searches));
      }
      if (parsed.profile && typeof parsed.profile.name === "string") {
        localStorage.setItem(
          "rapphim.profile",
          JSON.stringify({ ...parsed.profile, createdAt: Date.now() }),
        );
      }
      window.location.reload();
    } catch {
      setMessage("File không đọc được. Hãy chọn đúng file JSON đã xuất từ RapPhim.");
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold text-fg">Quản lý dữ liệu</h2>
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
        Toàn bộ thư viện nằm trong trình duyệt này, không có bản sao trên máy chủ. Xoá dữ
        liệu duyệt web là mất. Xuất ra file JSON để giữ lại hoặc mang sang máy khác.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportJson}
          className="h-9 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
        >
          Xuất dữ liệu
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-9 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
        >
          Nhập từ file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={importJson}
          className="hidden"
        />

        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setConfirming(false);
                setMessage("Đã xoá toàn bộ thư viện trên trình duyệt này.");
              }}
              className="flex h-9 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-brand-fg transition hover:opacity-90"
            >
              <TrashIcon width={18} height={18} />
              Xác nhận xoá tất cả
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-9 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
            >
              Huỷ
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
          >
            <TrashIcon width={18} height={18} />
            Xoá toàn bộ thư viện
          </button>
        )}
      </div>

      {message && (
        <p role="status" className="mt-3 text-sm text-muted">
          {message}
        </p>
      )}
    </section>
  );
}
