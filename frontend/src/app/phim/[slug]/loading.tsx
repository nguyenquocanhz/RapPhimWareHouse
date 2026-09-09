/** Khung xuong cua trang xem phim, hien trong khi cho nguon tra ve chi tiet. */
export default function Loading() {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_402px]">
        <div className="min-w-0">
          <div className="skeleton aspect-video w-full rounded-xl" />
          <div className="skeleton mt-4 h-6 w-3/5 rounded" />
          <div className="skeleton mt-2 h-4 w-2/5 rounded" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="skeleton h-7 w-20 rounded-lg" />
            ))}
          </div>
          <div className="skeleton mt-4 h-48 w-full rounded-xl" />
        </div>
        <div className="skeleton h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}
