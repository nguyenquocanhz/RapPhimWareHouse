import Link from "next/link";

import { SearchIcon } from "@/components/ui/icons";

/** Khoi hien khi truy van hop le nhung khong co ket qua nao. */
export function EmptyState({
  title = "Không có phim nào",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-surface px-6 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-surface-hover text-muted">
        <SearchIcon width={28} height={28} />
      </span>
      <h2 className="text-lg font-medium text-fg">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-muted">{description}</p>}
      <Link
        href="/"
        className="mt-6 rounded-full bg-chip-active px-4 py-2 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}

/** Khoi hien khi goi API that bai, kem goi y khac phuc. */
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-10">
      <h2 className="text-lg font-medium text-fg">Không tải được dữ liệu</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-4 text-sm text-muted">
        Kiểm tra backend đã chạy tại{" "}
        <code className="rounded bg-surface-hover px-1.5 py-0.5 text-fg">http://localhost:8080</code>{" "}
        chưa. Có thể xem trạng thái tại{" "}
        <a
          href="http://localhost:8080/actuator/health"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          /actuator/health
        </a>
        .
      </p>
    </div>
  );
}

/** Tieu de trang dung chung cho cac trang danh sach. */
export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-fg sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
