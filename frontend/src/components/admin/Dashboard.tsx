"use client";

import { useEffect, useState } from "react";

import { CheckIcon, CloseIcon, DatabaseIcon } from "@/components/ui/icons";

/**
 * Bang tong quan cua trang quan tri.
 *
 * <p>Chi hien "da cau hinh hay chua" chu khong hien gia tri nao: trang nay chi can noi
 * cho nguoi dung biet con thieu gi de di dat, khong can - va khong nen - biet khoa.</p>
 */

interface Status {
  providers: string[];
  builtInCount: number;
  customCount: number;
  customEnabledCount: number;
  tmdbConfigured: boolean;
  homelabConfigured: boolean;
  adminConfigured: boolean;
}

export function Dashboard({ round }: { round: number }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/system/status", { cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;

        if (!response.ok) throw new Error(body?.message ?? "Không đọc được trạng thái.");
        setStatus(body.data);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Không đọc được trạng thái.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // `round` tang moi lan danh sach nguon doi, de bang nay doc lai theo.
  }, [round]);

  if (error) {
    return (
      <p className="mt-4 max-w-2xl rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        {error}
      </p>
    );
  }

  if (!status) {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Nguồn đang hoạt động"
          value={String(status.providers.length)}
          note={`${status.builtInCount} dựng sẵn + ${status.customEnabledCount} tự thêm`}
        />
        <Card
          label="Nguồn tự thêm"
          value={String(status.customCount)}
          note={
            status.customCount === status.customEnabledCount
              ? "Tất cả đang bật"
              : `${status.customCount - status.customEnabledCount} đang tắt`
          }
        />
        <Flag
          label="Kho phim riêng"
          on={status.homelabConfigured}
          note={status.homelabConfigured ? "Đã cắm khoá ZCloud" : "Chưa đặt ZCLOUD_API_KEY"}
        />
        <Flag
          label="Metadata TMDB"
          on={status.tmdbConfigured}
          note={status.tmdbConfigured ? "Dùng được cho file NFO" : "Chưa đặt TMDB_ACCESS_TOKEN"}
        />
      </div>

      {/* Ma nguon: cai duy nhat o day nguoi dung se go vao URL */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border px-4 py-3">
        <span className="text-sm text-muted">Mã nguồn dùng được:</span>
        {status.providers.map((code) => (
          <code key={code} className="rounded bg-chip px-2 py-0.5 text-xs text-fg">
            {code}
          </code>
        ))}
      </div>
    </>
  );
}

function Card({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

function Flag({ label, on, note }: { label: string; on: boolean; note: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm text-muted">{label}</p>

      <p className="mt-1 flex items-center gap-2 text-sm font-medium text-fg">
        <span
          className={`grid size-6 place-items-center rounded-full ${
            on ? "bg-chip-active text-chip-active-fg" : "bg-chip text-muted"
          }`}
        >
          {on ? <CheckIcon width={14} height={14} /> : <CloseIcon width={14} height={14} />}
        </span>
        {on ? "Đã cấu hình" : "Chưa cấu hình"}
      </p>

      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

/** Dung o cho trong khi chua co nguon nao, cho bot trong trai. */
export function EmptyHint() {
  return (
    <p className="mt-2 flex items-center gap-2 rounded-xl bg-surface px-4 py-5 text-sm text-muted">
      <DatabaseIcon width={18} height={18} />
      Chưa có nguồn nào. Điền vào ô bên dưới để thêm.
    </p>
  );
}
