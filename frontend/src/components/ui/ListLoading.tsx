import { MovieGridSkeleton } from "@/components/movie/MovieGrid";

/**
 * Khung xuong cua cac trang danh sach, dung trong luc cho nguon phim phan hoi.
 *
 * Chi dat o nhung route thuc su goi mang. Dat o goc `app/` se boc ca cac trang
 * render dong bo (thu vien ca nhan doc localStorage) va fallback o do khong bao gio
 * duoc thay the, khien man hinh ket o khung xuong.
 */
export function ListLoading() {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-6 flex gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="skeleton mb-6 h-7 w-56 rounded" />
      <MovieGridSkeleton />
    </div>
  );
}
