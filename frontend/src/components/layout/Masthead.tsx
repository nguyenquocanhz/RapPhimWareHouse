"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { SearchBox } from "@/components/layout/SearchBox";
import { useShell } from "@/components/layout/ShellContext";
import {
  BellIcon,
  BookmarkIcon,
  CloseIcon,
  MenuIcon,
  PlayIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { useNotifications } from "@/lib/notifications";

/**
 * Thanh dieu huong tren cung: nut menu, logo, o tim kiem dang vien thuoc
 * va cac nut phu ben phai - bo cuc quen thuoc cua YouTube.
 */
export function Masthead() {
  const { toggleSidebar } = useShell();
  const { unreadCount } = useNotifications();
  const searchParams = useSearchParams();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Tu khoa tren URL la nguon su that. Dat lam `key` de o nhap tu nap lai gia tri
  // moi khi nguoi dung dieu huong, khong can dong bo bang useEffect.
  const urlKeyword = searchParams.get("keyword") ?? "";

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 bg-canvas">
      <div className="flex h-full items-center gap-2 px-4">
        {/* Trai: menu + logo */}
        <div className={`items-center gap-1 ${mobileSearchOpen ? "hidden sm:flex" : "flex"}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Mở hoặc thu gọn menu"
            className="grid size-10 place-items-center rounded-full text-fg transition hover:bg-surface-hover"
          >
            <MenuIcon />
          </button>

          <Link href="/" className="flex items-center gap-1 pr-2" aria-label="RapPhim - về trang chủ">
            <span className="grid size-7 place-items-center rounded-lg bg-brand text-brand-fg">
              <PlayIcon width={18} height={18} />
            </span>
            <span className="text-xl font-semibold tracking-tighter text-fg">RapPhim</span>
            <span className="mt-1 hidden text-[10px] font-medium text-muted sm:inline">VN</span>
          </Link>
        </div>

        {/* Giua: o tim kiem */}
        <div className={`flex-1 justify-center ${mobileSearchOpen ? "flex" : "hidden sm:flex"}`}>
          <div className="flex w-full max-w-[640px] items-center gap-2">
            {mobileSearchOpen && (
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Đóng tìm kiếm"
                className="grid size-10 shrink-0 place-items-center rounded-full text-fg transition hover:bg-surface-hover sm:hidden"
              >
                <CloseIcon />
              </button>
            )}

            <SearchBox
              key={urlKeyword}
              initialKeyword={urlKeyword}
              autoFocus={mobileSearchOpen}
              onSubmitted={() => setMobileSearchOpen(false)}
            />
          </div>
        </div>

        {/* Phai: cac nut phu */}
        <div className={`ml-auto items-center gap-1 ${mobileSearchOpen ? "hidden sm:flex" : "flex"}`}>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Mở ô tìm kiếm"
            className="grid size-10 place-items-center rounded-full text-fg transition hover:bg-surface-hover sm:hidden"
          >
            <SearchIcon />
          </button>

          <Link
            href="/thong-bao"
            aria-label={
              unreadCount > 0 ? `Thông báo, ${unreadCount} mục chưa đọc` : "Thông báo"
            }
            title="Thông báo"
            className="relative grid size-10 place-items-center rounded-full text-fg transition hover:bg-surface-hover"
          >
            <BellIcon />
            {/* So chua doc doc tu localStorage nen chi co sau khi hydrate. */}
            {unreadCount > 0 && (
              <span
                suppressHydrationWarning
                className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-medium leading-4 text-brand-fg"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <Link
            href="/da-luu"
            aria-label="Phim đã lưu"
            title="Phim đã lưu"
            className="hidden size-10 place-items-center rounded-full text-fg transition hover:bg-surface-hover sm:grid"
          >
            <BookmarkIcon />
          </Link>

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
