import Link from "next/link";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Duong dan goc, vi du "/the-loai/hanh-dong". */
  basePath: string;
  /** Cac tham so query giu nguyen khi doi trang. */
  query?: Record<string, string | undefined>;
}

/**
 * Phan trang dang so, luon hien toi da 5 so quanh trang hien tai
 * cung hai nut lui / tien.
 */
export function Pagination({ page, totalPages, basePath, query = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const cap = Math.min(totalPages, 10_000);
  const pages = pageWindow(page, cap);

  function href(target: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const suffix = search.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  }

  return (
    <nav aria-label="Phân trang" className="mt-10 flex items-center justify-center gap-2">
      <PageLink
        href={href(page - 1)}
        disabled={page <= 1}
        label="Trang trước"
        icon={<ChevronLeftIcon width={20} height={20} />}
      />

      {pages[0] > 1 && (
        <>
          <NumberLink href={href(1)} page={1} active={false} />
          {pages[0] > 2 && <Ellipsis />}
        </>
      )}

      {pages.map((item) => (
        <NumberLink key={item} href={href(item)} page={item} active={item === page} />
      ))}

      {pages[pages.length - 1] < cap && (
        <>
          {pages[pages.length - 1] < cap - 1 && <Ellipsis />}
          <NumberLink href={href(cap)} page={cap} active={false} />
        </>
      )}

      <PageLink
        href={href(page + 1)}
        disabled={page >= cap}
        label="Trang sau"
        icon={<ChevronRightIcon width={20} height={20} />}
      />
    </nav>
  );
}

/** Danh sach so trang hien quanh trang dang xem. */
function pageWindow(page: number, totalPages: number): number[] {
  const size = 5;
  let start = Math.max(1, page - Math.floor(size / 2));
  const end = Math.min(totalPages, start + size - 1);
  start = Math.max(1, end - size + 1);

  const result: number[] = [];
  for (let i = start; i <= end; i += 1) result.push(i);
  return result;
}

function NumberLink({ href, page, active }: { href: string; page: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`grid h-9 min-w-9 place-items-center rounded-full px-3 text-sm transition ${
        active
          ? "bg-chip-active font-medium text-chip-active-fg"
          : "bg-chip text-fg hover:bg-chip-hover"
      }`}
    >
      {page}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className="grid size-9 place-items-center rounded-full bg-chip text-muted opacity-40"
      >
        {icon}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full bg-chip text-fg transition hover:bg-chip-hover"
    >
      {icon}
    </Link>
  );
}

function Ellipsis() {
  return (
    <span aria-hidden="true" className="px-1 text-sm text-muted">
      …
    </span>
  );
}
