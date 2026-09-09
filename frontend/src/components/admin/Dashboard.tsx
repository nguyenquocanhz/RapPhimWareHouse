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
  tmdbKeyShape: string;
  homelabConfigured: boolean;
  adminConfigured: boolean;
}

export function Dashboard({
  round,
  token,
  writable,
  onSaved,
}: {
  round: number;
  token: string;
  writable: boolean;
  onSaved: (message: string) => void;
}) {
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
        <KeyCard
          label="Kho phim riêng"
          name="zcloudApiKey"
          hint="Khoá x-api-key của ZCloud."
          on={status.homelabConfigured}
          token={token}
          writable={writable}
          onSaved={onSaved}
        />
        <KeyCard
          label="Metadata TMDB"
          name="tmdbAccessToken"
          hint="Token đọc v4 của TheMovieDB."
          on={status.tmdbConfigured}
          warning={
            status.tmdbKeyShape === "v3"
              ? "Đang giữ khoá v3 chứ không phải token v4, hệ thống tự gọi theo kiểu v3 nên " +
                "vẫn chạy. Muốn dùng v4 thì lấy dòng “API Read Access Token” bên TheMovieDB."
              : status.tmdbKeyShape === "khong ro"
                ? "Khoá không giống token v4 lẫn khoá v3. Có thể đã dán thiếu hoặc lẫn khoảng trắng."
                : undefined
          }
          token={token}
          writable={writable}
          onSaved={onSaved}
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

/**
 * The cau hinh sua duoc ngay tai cho.
 *
 * <p>Truoc day the nay chi bao "chua cau hinh" roi de do - muon sua phai vao may chu,
 * sua .env va khoi dong lai. Chi ra van de ma khong co cho sua thi chi la mot loi
 * nhac phien.</p>
 *
 * <p>O nhap luon rong: gia tri da luu khong bao gio duoc doc nguoc ra, go vao la thay
 * gia tri cu.</p>
 */
function KeyCard({
  label,
  name,
  hint,
  on,
  warning,
  token,
  writable,
  onSaved,
}: {
  label: string;
  name: string;
  hint: string;
  on: boolean;
  /** Khoa da dat nhung nhin la biet sai; van hien dau tich vi no co dat that. */
  warning?: string;
  token: string;
  writable: boolean;
  onSaved: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(next: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ name, value: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message ?? "Không lưu được.");

      setValue("");
      setOpen(false);
      onSaved(next ? `Đã lưu ${label}.` : `Đã xoá khoá ${label}.`);
    } catch (cause) {
      onSaved(cause instanceof Error ? cause.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

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

      {warning && (
        <p className="mt-1.5 rounded-lg bg-chip px-2 py-1.5 text-xs leading-relaxed text-fg">
          {warning}
        </p>
      )}

      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(value);
          }}
          className="mt-2"
        >
          <input
            autoFocus
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Dán khoá vào đây"
            disabled={busy}
            className="w-full rounded-lg border border-border bg-canvas px-2 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-fg/40"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="submit"
              disabled={busy || value.trim() === ""}
              className="rounded-full bg-chip-active px-3 py-1 text-xs font-medium text-chip-active-fg transition hover:opacity-90 disabled:opacity-40"
            >
              Lưu
            </button>
            {on && (
              <button
                type="button"
                onClick={() => submit("")}
                disabled={busy}
                className="rounded-full px-3 py-1 text-xs text-muted transition hover:bg-surface-hover hover:text-fg disabled:opacity-40"
              >
                Xoá khoá
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 text-xs text-muted transition hover:bg-surface-hover hover:text-fg"
            >
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{hint}</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!writable || token === ""}
            title={token === "" ? "Nhập khoá quản trị ở trên trước" : undefined}
            className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-fg transition hover:bg-chip-hover disabled:opacity-40"
          >
            {on ? "Đổi" : "Đặt"}
          </button>
        </div>
      )}
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
