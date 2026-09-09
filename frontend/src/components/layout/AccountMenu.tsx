"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { useShell, type Theme } from "@/components/layout/ShellContext";
import {
  BellIcon,
  BookmarkIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DatabaseIcon,
  GlobeIcon,
  HistoryIcon,
  KeyboardIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "@/components/ui/icons";
import { avatarClass, initialOf, useProfile } from "@/lib/profile";

type Panel = "main" | "theme" | "shortcuts";

/**
 * Menu tai khoan mo tu o dai dien, dung bo cuc cua YouTube: khoi thong tin o dau,
 * cac muc dieu huong, roi cac muc cai dat mo ra bang phu ngay trong menu.
 *
 * Toan bo noi dung chi render khi menu mo, tuc la sau khi hydrate, nen phan
 * phu thuoc localStorage (ten, mau, giao dien dang chon) khong gay lech hydrate.
 */
export function AccountMenu() {
  const { theme, setTheme } = useShell();
  const { profile } = useProfile();

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setPanel("main");
  }

  /** Dong menu roi tra con tro ve nut mo, dung thoi quen cua ban phim. */
  function closeAndRefocus() {
    close();
    buttonRef.current?.focus();
  }

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          closeAndRefocus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu tài khoản"
        title={profile.name}
        suppressHydrationWarning
        className={`ml-1 grid size-8 place-items-center rounded-full text-sm font-medium transition hover:opacity-90 ${avatarClass(profile.color)}`}
      >
        {initialOf(profile.name)}
      </button>

      {open && (
        <>
          {/* Lop trong suot de bam ra ngoai la dong menu. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            role="menu"
            aria-label="Menu tài khoản"
            className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-border bg-canvas py-2 shadow-2xl"
          >
            {panel === "main" && (
              <MainPanel
                name={profile.name}
                color={profile.color}
                theme={theme}
                onClose={close}
                onOpenPanel={setPanel}
              />
            )}

            {panel === "theme" && (
              <ThemePanel
                theme={theme}
                onBack={() => setPanel("main")}
                onPick={(next) => {
                  setTheme(next);
                  setPanel("main");
                }}
              />
            )}

            {panel === "shortcuts" && <ShortcutsPanel onBack={() => setPanel("main")} />}
          </div>
        </>
      )}
    </div>
  );
}

function MainPanel({
  name,
  color,
  theme,
  onClose,
  onOpenPanel,
}: {
  name: string;
  color: ReturnType<typeof useProfile>["profile"]["color"];
  theme: Theme;
  onClose: () => void;
  onOpenPanel: (panel: Panel) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 pb-3 pt-2">
        <span
          aria-hidden="true"
          className={`grid size-10 shrink-0 place-items-center rounded-full text-base font-semibold ${avatarClass(color)}`}
        >
          {initialOf(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{name}</p>
          <Link
            href="/ho-so"
            onClick={onClose}
            role="menuitem"
            className="text-xs text-blue-500 hover:underline"
          >
            Xem hồ sơ
          </Link>
        </div>
      </div>

      <Divider />

      <ItemLink href="/thong-bao" icon={<BellIcon />} onClick={onClose}>
        Thông báo
      </ItemLink>
      <ItemLink href="/dang-xem" icon={<HistoryIcon />} onClick={onClose}>
        Đang xem
      </ItemLink>
      <ItemLink href="/da-luu" icon={<BookmarkIcon />} onClick={onClose}>
        Phim đã lưu
      </ItemLink>
      <ItemLink href="/lich-su-tim-kiem" icon={<SearchIcon />} onClick={onClose}>
        Lịch sử tìm kiếm
      </ItemLink>
      <ItemLink href="/kham-pha" icon={<GlobeIcon />} onClick={onClose}>
        Khám phá TMDB
      </ItemLink>

      <Divider />

      <ItemButton
        icon={theme === "dark" ? <MoonIcon /> : <SunIcon />}
        onClick={() => onOpenPanel("theme")}
        trailing={
          <span className="flex items-center gap-1 text-xs text-muted">
            {theme === "dark" ? "Tối" : "Sáng"}
            <ChevronRightIcon width={16} height={16} />
          </span>
        }
      >
        Giao diện
      </ItemButton>

      <ItemButton
        icon={<KeyboardIcon />}
        onClick={() => onOpenPanel("shortcuts")}
        trailing={<ChevronRightIcon width={16} height={16} />}
      >
        Phím tắt
      </ItemButton>

      <ItemLink href="/ho-so" icon={<DatabaseIcon />} onClick={onClose}>
        Quản lý dữ liệu
      </ItemLink>

      <Divider />

      <ItemLink href="/ho-so" icon={<UserIcon />} onClick={onClose}>
        Hồ sơ của bạn
      </ItemLink>
    </>
  );
}

function ThemePanel({
  theme,
  onBack,
  onPick,
}: {
  theme: Theme;
  onBack: () => void;
  onPick: (theme: Theme) => void;
}) {
  return (
    <>
      <PanelHeader title="Giao diện" onBack={onBack} />
      <p className="px-4 pb-2 text-xs text-muted">
        Lựa chọn chỉ áp dụng cho trình duyệt này.
      </p>

      <ItemButton
        icon={theme === "dark" ? <CheckIcon /> : <span className="block size-6" />}
        onClick={() => onPick("dark")}
      >
        Giao diện tối
      </ItemButton>
      <ItemButton
        icon={theme === "light" ? <CheckIcon /> : <span className="block size-6" />}
        onClick={() => onPick("light")}
      >
        Giao diện sáng
      </ItemButton>
    </>
  );
}

function ShortcutsPanel({ onBack }: { onBack: () => void }) {
  const shortcuts = [
    { keys: "/", action: "Nhảy vào ô tìm kiếm" },
    { keys: "Ctrl + K", action: "Nhảy vào ô tìm kiếm" },
    { keys: "Esc", action: "Đóng menu hoặc ô gợi ý" },
  ];

  return (
    <>
      <PanelHeader title="Phím tắt" onBack={onBack} />
      <ul className="px-4 pb-2">
        {shortcuts.map((shortcut) => (
          <li
            key={`${shortcut.keys}-${shortcut.action}`}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="text-fg">{shortcut.action}</span>
            <kbd className="shrink-0 rounded border border-border bg-surface px-2 py-0.5 text-xs text-muted">
              {shortcut.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </>
  );
}

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-1 flex items-center gap-2 border-b border-border px-2 pb-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại menu chính"
        className="grid size-9 place-items-center rounded-full text-fg transition hover:bg-surface-hover"
      >
        <ChevronLeftIcon width={20} height={20} />
      </button>
      <span className="text-sm font-medium text-fg">{title}</span>
    </div>
  );
}

function Divider() {
  return <hr className="my-2 border-border" />;
}

const ITEM_CLASS =
  "flex w-full items-center gap-4 px-4 py-2.5 text-left text-sm text-fg transition hover:bg-surface-hover";

function ItemLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className={ITEM_CLASS}>
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function ItemButton({
  icon,
  onClick,
  trailing,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={ITEM_CLASS}>
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="truncate">{children}</span>
      {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
    </button>
  );
}
