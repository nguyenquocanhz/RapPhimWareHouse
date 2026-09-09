"use client";

import { useEffect } from "react";

/**
 * Ranh gioi loi o muc goc: hien thong bao va cho phep thu lai
 * ma khong phai tai lai ca trang.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-medium text-fg">Đã xảy ra lỗi</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {error.message || "Không tải được nội dung. Vui lòng thử lại."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-chip-active px-5 py-2.5 text-sm font-medium text-chip-active-fg transition hover:opacity-90"
      >
        Thử lại
      </button>
    </div>
  );
}
