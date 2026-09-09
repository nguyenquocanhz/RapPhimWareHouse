import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-xl font-medium text-fg">Không tìm thấy trang</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Đường dẫn không tồn tại, hoặc bộ phim bạn tìm đã bị gỡ khỏi nguồn dữ liệu.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-chip-active px-5 py-2.5 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
