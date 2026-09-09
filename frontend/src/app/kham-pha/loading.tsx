import { DiscoverGridSkeleton } from "@/components/tmdb/DiscoverCard";

export default function Loading() {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="skeleton mb-2 h-7 w-48 rounded" />
      <div className="skeleton mb-6 h-4 w-72 rounded" />
      <div className="mb-4 flex gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="mb-6 flex gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-9 w-32 rounded-lg" />
        ))}
      </div>
      <DiscoverGridSkeleton />
    </div>
  );
}
