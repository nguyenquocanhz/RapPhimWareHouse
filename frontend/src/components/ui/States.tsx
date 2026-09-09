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

/**
 * Khoi hien khi goi API that bai.
 *
 * <p>Goi y khac phuc chi hien khi that su khong goi duoc backend. Truoc day no hien
 * voi moi loi - ke ca khi backend dang chay ngon lanh va chinh no bao loi tu nguon
 * ben ngoai - lam nguoi dung di kiem tra nham cho.</p>
 *
 * <p>Cung khong con ghi dia chi backend nua: trinh duyet khong goi thang backend bao
 * gio, nen mot dia chi nhu localhost:8080 vua sai voi ban chay bang Docker, vua khong
 * bam vao duoc.</p>
 */
export function ErrorState({
  message,
  unreachable = false,
  hint,
}: {
  message: string;
  /** Loi la do khong ket noi duoc toi backend, khong phai loi tu nguon ben ngoai. */
  unreachable?: boolean;
  /** Loi nhac rieng cho tung truong hop, vi du nguon bi chan o tang mang. */
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-10">
      <h2 className="text-lg font-medium text-fg">Không tải được dữ liệu</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>

      {unreachable && (
        <p className="mt-4 text-sm text-muted">
          Máy chủ API không trả lời. Kiểm tra xem nó đã chạy chưa, và xem log nếu bạn
          đang tự chạy bằng Docker.
        </p>
      )}

      {hint && <p className="mt-4 text-sm text-muted">{hint}</p>}
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
