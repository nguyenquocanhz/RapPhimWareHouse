"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useShell, type SidebarState } from "@/components/layout/ShellContext";
import {
  AnimationIcon,
  BellIcon,
  BookmarkIcon,
  DatabaseIcon,
  FilmIcon,
  GlobeIcon,
  HistoryIcon,
  HomeIcon,
  SearchIcon,
  SeriesIcon,
  TagIcon,
  TrendingIcon,
  TvShowIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useFavorites, useRecentSearches, useWatchHistory } from "@/lib/library";
import { useNotifications } from "@/lib/notifications";
import type { Taxonomy } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const PRIMARY: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: <HomeIcon /> },
  { href: "/kham-pha", label: "Khám phá", icon: <GlobeIcon /> },
  { href: "/danh-sach/phim-bo", label: "Phim bộ", icon: <SeriesIcon /> },
  { href: "/danh-sach/phim-le", label: "Phim lẻ", icon: <FilmIcon /> },
  { href: "/danh-sach/tv-shows", label: "TV Shows", icon: <TvShowIcon /> },
  { href: "/danh-sach/hoat-hinh", label: "Hoạt hình", icon: <AnimationIcon /> },
];

const LIBRARY: NavItem[] = [
  { href: "/ho-so", label: "Hồ sơ của bạn", icon: <UserIcon /> },
  { href: "/thong-bao", label: "Thông báo", icon: <BellIcon /> },
  { href: "/dang-xem", label: "Đang xem", icon: <HistoryIcon /> },
  { href: "/da-luu", label: "Phim đã lưu", icon: <BookmarkIcon /> },
  { href: "/lich-su-tim-kiem", label: "Lịch sử tìm kiếm", icon: <SearchIcon /> },
];

/**
 * Muc quan tri.
 *
 * <p>Tach thanh nhom rieng dat cuoi cung chu khong tron vao cac muc xem phim: day la
 * cho sua cau hinh cua ca he thong, khong phai mot muc de duyet phim.</p>
 */
const ADMIN: NavItem[] = [{ href: "/cms", label: "Quản trị nguồn", icon: <DatabaseIcon /> }];

const SECONDARY: NavItem[] = [
  { href: "/danh-sach/phim-vietsub", label: "Vietsub", icon: <TrendingIcon /> },
  { href: "/danh-sach/phim-thuyet-minh", label: "Thuyết minh", icon: <TrendingIcon /> },
  { href: "/danh-sach/phim-long-tieng", label: "Lồng tiếng", icon: <TrendingIcon /> },
];

interface SidebarProps {
  categories: Taxonomy[];
  countries: Taxonomy[];
}

/** Vi tri cua sidebar ung voi tung trang thai. */
const PANEL_CLASS: Record<SidebarState, string> = {
  auto: "-translate-x-full xl:translate-x-0",
  open: "translate-x-0",
  closed: "-translate-x-full",
};

/** Thanh ray chi thay the sidebar tren desktop khi sidebar da dong. */
const RAIL_CLASS: Record<SidebarState, string> = {
  auto: "xl:hidden",
  open: "xl:hidden",
  closed: "xl:flex",
};

export function Sidebar({ categories, countries }: SidebarProps) {
  const { sidebarState, closeSidebar } = useShell();
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const { history } = useWatchHistory();
  const { searches } = useRecentSearches();
  const { unreadCount } = useNotifications();

  // So luong doc tu localStorage nen lan render tren server luon la 0.
  const counts: Record<string, number> = {
    "/dang-xem": history.length,
    "/da-luu": favorites.length,
    "/lich-su-tim-kiem": searches.length,
    "/thong-bao": unreadCount,
  };

  return (
    <>
      {/* Lop phu chi xuat hien khi nguoi dung chu dong bung sidebar tren man hinh hep. */}
      {sidebarState === "open" && (
        <div
          onClick={closeSidebar}
          aria-hidden="true"
          className="fixed inset-0 top-14 z-30 bg-black/60 xl:hidden"
        />
      )}

      {/* Thanh ray thu gon: chi hien tren desktop khi sidebar dong. */}
      <nav
        aria-label="Điều hướng thu gọn"
        className={`fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-rail flex-col overflow-y-auto overflow-x-hidden bg-canvas pt-1 ${RAIL_CLASS[sidebarState]}`}
      >
        {PRIMARY.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {/* Sidebar day du. */}
      <nav
        aria-label="Điều hướng chính"
        className={`fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-sidebar overflow-y-auto bg-canvas px-3 pb-8 pt-1 transition-transform duration-200 ${PANEL_CLASS[sidebarState]}`}
      >
        <Section>
          {PRIMARY.map((item) => (
            <FullLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={closeSidebar}
            />
          ))}
        </Section>

        <Divider />

        <Section title="Thư viện">
          {LIBRARY.map((item) => (
            <FullLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={closeSidebar}
              badge={counts[item.href]}
            />
          ))}
        </Section>

        <Divider />

        <Section title="Bản phát">
          {SECONDARY.map((item) => (
            <FullLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={closeSidebar}
            />
          ))}
        </Section>

        <Divider />

        <Section title="Quản trị">
          {ADMIN.map((item) => (
            <FullLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={closeSidebar}
            />
          ))}
        </Section>

        {categories.length > 0 && (
          <>
            <Divider />
            <Section title="Thể loại">
              {categories.map((category) => (
                <FullLink
                  key={category.slug}
                  item={{
                    href: `/the-loai/${category.slug}`,
                    label: category.name,
                    icon: <TagIcon />,
                  }}
                  active={isActive(pathname, `/the-loai/${category.slug}`)}
                  onNavigate={closeSidebar}
                />
              ))}
            </Section>
          </>
        )}

        {countries.length > 0 && (
          <>
            <Divider />
            <Section title="Quốc gia">
              {countries.map((country) => (
                <FullLink
                  key={country.slug}
                  item={{
                    href: `/quoc-gia/${country.slug}`,
                    label: country.name,
                    icon: <GlobeIcon />,
                  }}
                  active={isActive(pathname, `/quoc-gia/${country.slug}`)}
                  onNavigate={closeSidebar}
                />
              ))}
            </Section>
          </>
        )}

        <Divider />

        <div className="px-3 py-4 text-xs leading-5 text-muted">
          <p className="mb-2 flex items-center gap-2 font-medium">
            <DatabaseIcon width={16} height={16} />
            Nguồn dữ liệu
          </p>
          {/*
            Khong dat lien ket toi Swagger o day nua: dia chi backend khac nhau tuy noi
            cai dat, ma nhung vao ma luc build thi anh Docker lai het dung chung duoc.
            Ai can tai lieu API thi mo /swagger-ui.html tren chinh may chay backend.
          */}
          <p>
            Dữ liệu phim lấy từ KKPhim và NguonC qua REST API của RapPhim WareHouse.
            Tài liệu API nằm ở <code className="text-fg">/swagger-ui.html</code> trên
            máy chủ API.
          </p>
        </div>
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="py-2">
      {title && (
        <h2 className="px-3 pb-1 pt-2 text-base font-medium text-fg">{title}</h2>
      )}
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-border" />;
}

function FullLink({
  item,
  active,
  onNavigate,
  badge,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-6 rounded-lg px-3 text-sm transition ${
        active ? "bg-surface-hover font-medium text-fg" : "text-fg hover:bg-surface-hover"
      }`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
      {badge !== undefined && (
        <span
          suppressHydrationWarning
          className="ml-auto shrink-0 text-xs text-muted empty:hidden"
        >
          {badge > 0 ? badge : ""}
        </span>
      )}
    </Link>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`mx-1 flex flex-col items-center gap-1 rounded-lg px-1 py-4 text-[10px] transition ${
        active ? "bg-surface-hover text-fg" : "text-fg hover:bg-surface-hover"
      }`}
    >
      {item.icon}
      <span className="w-full truncate text-center">{item.label}</span>
    </Link>
  );
}
