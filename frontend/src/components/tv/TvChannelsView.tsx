"use client";

import { useState } from "react";

import { usePlayer } from "@/components/watch/usePlayer";
import type { TvChannel } from "@/lib/types";

/**
 * Trang kenh truyen hinh truc tiep. Bam mot kenh la phat ngay bang trinh phat HLS
 * (dung chung hls.js voi trinh phat phim). Kenh la luong .m3u8 truc tiep.
 */
export function TvChannelsView({ channels }: { channels: TvChannel[] }) {
  const [active, setActive] = useState<TvChannel | null>(null);
  const { videoRef, state } = usePlayer(active?.url ?? null, "hls");

  return (
    <div className="px-4 py-5 sm:px-6">
      <header className="mb-5 flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Truyền hình trực tiếp</h1>
        <span className="text-sm text-muted">{channels.length} kênh</span>
      </header>

      {active && (
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-black">
          <div className="relative aspect-video w-full">
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              className="h-full w-full bg-black"
            />
            {state.waiting && !state.error && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-white/80">
                Đang tải luồng…
              </div>
            )}
            {state.error && (
              <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/80">
                Không phát được kênh này — có thể kênh đang tắt hoặc bị chặn theo khu vực.
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{active.name}</p>
              {active.group && <p className="truncate text-xs text-muted">{active.group}</p>}
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {channels.map((ch) => {
          const on = active?.url === ch.url;
          return (
            <button
              type="button"
              key={ch.id + ch.url}
              onClick={() => setActive(ch)}
              title={ch.name}
              className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                on ? "border-brand" : "border-border hover:border-brand/60"
              }`}
            >
              <div className="grid aspect-video place-items-center bg-surface p-3">
                {ch.logo ? (
                  // Logo kenh o nhieu host ngoai (imgur, ibb...) nen dung <img> thuong,
                  // khong qua next/image de khoi phai liet ke allowlist.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ch.logo}
                    alt={ch.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="line-clamp-2 text-center text-sm font-medium">{ch.name}</span>
                )}
              </div>
              <span className="truncate px-2.5 py-2 text-xs text-muted group-hover:text-fg">
                {ch.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
