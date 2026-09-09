"use client";

import { useEffect, useState } from "react";

import { ClockIcon } from "@/components/ui/icons";
import { relativeTime } from "@/lib/format";

/**
 * Nhat ky cac thay doi tren trang quan tri.
 *
 * <p>He thong khong co tai khoan nguoi dung, chi co mot khoa quan tri chung - nen "ai"
 * o day la <b>dia chi mang</b> chu khong phai ten nguoi. Trong mot may nha thi tung do
 * du de phan biet "minh vua sua" voi "co ai do trong nha vua sua".</p>
 */

interface Entry {
  at: string;
  action: string;
  target: string;
  actor: string;
  agent: string;
  ok: boolean;
  detail: string | null;
}

const ACTIONS: Record<string, string> = {
  "source.save": "Lưu nguồn",
  "source.delete": "Xoá nguồn",
  "setting.set": "Đặt khoá",
  "setting.clear": "Xoá khoá",
};

export function AuditLog({ round, token }: { round: number; token: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nhat ky co dia chi mang nen backend doi khoa; chua nhap thi khong goi.
    // Khong can xoa du lieu cu o day: luc chua co khoa thi phan ve ben duoi tra ve
    // loi nhac nhap khoa, khong dung toi du lieu.
    if (token === "") return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/audit", {
          cache: "no-store",
          headers: { "x-admin-token": token },
        });
        const body = await response.json();
        if (cancelled) return;

        if (!response.ok) throw new Error(body?.message ?? "Không đọc được nhật ký.");
        setEntries(body.data ?? []);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Không đọc được nhật ký.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [round, token]);

  if (token === "") {
    return (
      <p className="mt-2 rounded-xl bg-surface px-4 py-4 text-sm text-muted">
        Nhập khoá quản trị ở trên để xem nhật ký.
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        {error}
      </p>
    );
  }

  if (!entries) {
    return <div className="skeleton mt-2 h-24 rounded-xl" />;
  }

  if (entries.length === 0) {
    return (
      <p className="mt-2 rounded-xl bg-surface px-4 py-4 text-sm text-muted">
        Chưa có thay đổi nào được ghi lại.
      </p>
    );
  }

  return (
    <ul className="mt-2 max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="flex items-start gap-3 px-4 py-2.5">
          <ClockIcon width={16} height={16} className="mt-0.5 shrink-0 text-muted" />

          <div className="min-w-0 flex-1">
            <p className="text-sm text-fg">
              {ACTIONS[entry.action] ?? entry.action}
              <span className="ml-2 font-medium">{entry.target}</span>
              {!entry.ok && <span className="ml-2 text-xs text-muted">— không thành công</span>}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              từ {entry.actor}
              {entry.detail ? ` · ${entry.detail}` : ""}
            </p>
          </div>

          <span className="shrink-0 text-xs text-muted" suppressHydrationWarning>
            {relativeTime(entry.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
