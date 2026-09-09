"use client";

import { useCallback, useEffect, useState } from "react";

import { Dashboard, EmptyHint } from "@/components/admin/Dashboard";
import { CheckIcon, DatabaseIcon, TrashIcon } from "@/components/ui/icons";

/**
 * Trang quan tri nguon phim.
 *
 * <p>Rat nhieu trang phim Viet la ban sao API cua KKPhim, chi khac ten mien. Nen them
 * mot nguon chi can khai bao dia chi la chay duoc ngay, khong phai sua ma nguon roi
 * build lai.</p>
 *
 * <p>Khoa quan tri chi song trong bo nho cua tab dang mo - khong ghi vao localStorage.
 * Do la khoa cho phep doi noi lay phim cua ca he thong, de lai trong trinh duyet thi
 * bat ky doan ma nao chay tren trang cung doc duoc.</p>
 */

interface Source {
  id: string;
  name: string;
  baseUrl: string;
  cdnImage: string | null;
  enabled: boolean;
}

const EMPTY_FORM = { id: "", name: "", baseUrl: "", cdnImage: "", enabled: true };

export function SourceManager() {
  const [token, setToken] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [writable, setWritable] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [note, setNote] = useState<{ kind: "ok" | "loi"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Doc lai bang cach tang so lan, khong goi thang ham doc: dat state ngay trong than
  // effect la dieu React khuyen khong nen lam, con dat trong ham bat dong bo ben trong
  // thi duoc.
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/sources", { cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;

        if (!response.ok) throw new Error(body?.message ?? "Không đọc được danh sách.");
        setSources(body.data.items ?? []);
        setWritable(Boolean(body.data.writable));
      } catch (cause) {
        if (cancelled) return;
        setNote({ kind: "loi", text: cause instanceof Error ? cause.message : "Không đọc được." });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [round]);

  /** Goi backend kem khoa, tra ve than da doc san. */
  async function call(path: string, method: string, body?: unknown) {
    const response = await fetch(`/api/admin/${path}`, {
      method,
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = await response.json();
    if (!response.ok) {
      throw new Error(parsed?.message ?? "Thao tác không thành công.");
    }
    return parsed;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await action();
    } catch (cause) {
      setNote({ kind: "loi", text: cause instanceof Error ? cause.message : "Có lỗi xảy ra." });
    } finally {
      setBusy(false);
    }
  }

  const probe = () =>
    run(async () => {
      const parsed = await call("sources/probe", "POST", form);
      setNote({ kind: "ok", text: parsed.data.message });
    });

  const save = () =>
    run(async () => {
      await call("sources", "POST", form);
      setForm(EMPTY_FORM);
      setNote({ kind: "ok", text: "Đã lưu nguồn." });
      reload();
    });

  /**
   * Bat hoac tat mot nguon ma khong xoa khai bao.
   *
   * <p>Gui lai chinh nguon do voi co dao nguoc: backend nhan cung mot ma thi ghi de,
   * va dung/thoi dung nguon theo co - khong can them endpoint rieng.</p>
   */
  const toggle = (source: Source) =>
    run(async () => {
      const next = !source.enabled;
      await call("sources", "POST", { ...source, enabled: next });

      // Doi ngay trong danh sach dang hien, khong doi lan doc lai.
      //
      // `reload()` chi dat lich doc lai; tu luc luu xong den luc du lieu moi ve, cong
      // tac van ve trang thai cu - bam lan nua trong khoang do se gui lai dung gia tri
      // vua gui, tuc la khong doi gi ca.
      setSources((current) =>
        current.map((item) => (item.id === source.id ? { ...item, enabled: next } : item)),
      );

      setNote({ kind: "ok", text: next ? `Đã bật ${source.name}.` : `Đã tắt ${source.name}.` });
      reload();
    });

  const remove = (id: string) =>
    run(async () => {
      await call(`sources/${id}`, "DELETE");
      setNote({ kind: "ok", text: `Đã xoá nguồn ${id}.` });
      reload();
    });

  const ready = form.id.trim() !== "" && form.name.trim() !== "" && form.baseUrl.trim() !== "";

  return (
    <div className="px-4 py-5 sm:px-6">
      <h1 className="text-xl font-semibold text-fg sm:text-2xl">Quản trị</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Thêm nguồn dùng chung định dạng API của KKPhim - phần lớn trang phim Việt đều
        vậy. Khai báo địa chỉ là chạy được ngay, không phải sửa mã nguồn.
      </p>

      {/* Bang tong quan doc lai moi lan danh sach nguon doi */}
      <Dashboard
        round={round}
        token={token}
        writable={writable}
        onSaved={(text) => {
          setNote({ kind: "ok", text });
          reload();
        }}
      />

      {!writable && (
        <p className="mt-4 max-w-2xl rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Máy chủ chưa đặt <code className="text-fg">RAPPHIM_ADMIN_TOKEN</code> nên trang này
          chỉ xem được. Đặt biến môi trường đó rồi khởi động lại để sửa nguồn.
        </p>
      )}

      {/* Khoa quan tri: giu trong bo nho cua tab, khong ghi vao trinh duyet */}
      <label className="mt-6 block max-w-md">
        <span className="text-sm font-medium text-fg">Khoá quản trị</span>
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          disabled={!writable}
          placeholder="Nhập để mở khoá thao tác sửa"
          className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-fg/40 disabled:opacity-50"
        />
        <span className="mt-1 block text-xs text-muted">
          Chỉ nằm trong tab này, đóng tab là mất - không lưu vào trình duyệt.
        </span>
      </label>

      {note && (
        <p
          className={`mt-4 max-w-2xl rounded-xl px-4 py-3 text-sm ${
            note.kind === "ok" ? "bg-surface text-fg" : "border border-border bg-surface text-muted"
          }`}
        >
          {note.text}
        </p>
      )}

      {/* Danh sach dang co */}
      <h2 className="mt-8 text-sm font-medium text-fg">Đang có {sources.length} nguồn tự thêm</h2>

      {sources.length === 0 ? (
        <EmptyHint />
      ) : (
        <ul className="mt-2 max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
          {sources.map((source) => (
            <li key={source.id} className="flex items-center gap-3 px-4 py-3">
              <DatabaseIcon width={18} height={18} className="shrink-0 text-muted" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">
                  {source.name}
                  <span className="ml-2 font-normal text-muted">{source.id}</span>
                </p>
                <p className="truncate text-xs text-muted">{source.baseUrl}</p>
              </div>

              {/* Cong tac bat/tat: tat di thi nguon khong con phuc vu nhung khai bao
                  van con, khong phai go lai tu dau khi muon dung tiep */}
              <button
                type="button"
                role="switch"
                aria-checked={source.enabled}
                onClick={() => toggle(source)}
                disabled={!writable || busy || token === ""}
                aria-label={`${source.enabled ? "Tắt" : "Bật"} nguồn ${source.name}`}
                title={source.enabled ? "Đang bật, bấm để tắt" : "Đang tắt, bấm để bật"}
                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${
                  source.enabled ? "bg-chip-active" : "bg-chip"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 size-4 rounded-full bg-canvas transition-all ${
                    source.enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>

              <span className="w-16 shrink-0 text-xs text-muted">
                {source.enabled ? "Đang bật" : "Đang tắt"}
              </span>

              <button
                type="button"
                onClick={() => remove(source.id)}
                disabled={!writable || busy || token === ""}
                aria-label={`Xoá nguồn ${source.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg disabled:opacity-30"
              >
                <TrashIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Them nguon moi */}
      <h2 className="mt-8 text-sm font-medium text-fg">Thêm nguồn</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="mt-2 grid max-w-3xl gap-4 rounded-xl border border-border p-4 sm:grid-cols-2"
      >
        <Field
          label="Mã nguồn"
          hint="Chỉ chữ thường, số và dấu gạch ngang. Dùng trên URL."
          value={form.id}
          onChange={(value) => setForm({ ...form, id: value })}
          placeholder="phimhay"
          disabled={!writable}
        />
        <Field
          label="Tên hiển thị"
          value={form.name}
          onChange={(value) => setForm({ ...form, name: value })}
          placeholder="Phim Hay"
          disabled={!writable}
        />
        <Field
          label="Địa chỉ API"
          hint="Gốc REST API của nguồn."
          value={form.baseUrl}
          onChange={(value) => setForm({ ...form, baseUrl: value })}
          placeholder="https://phimapi.com"
          disabled={!writable}
        />
        <Field
          label="CDN ảnh"
          hint="Để trống nếu nguồn trả về địa chỉ ảnh đầy đủ."
          value={form.cdnImage}
          onChange={(value) => setForm({ ...form, cdnImage: value })}
          placeholder="https://phimimg.com"
          disabled={!writable}
        />

        <label className="flex items-center gap-2 text-sm text-fg sm:col-span-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
            disabled={!writable}
            className="size-4"
          />
          Bật ngay sau khi lưu
        </label>

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={probe}
            disabled={!writable || busy || !ready || token === ""}
            className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover disabled:opacity-40"
          >
            <CheckIcon width={18} height={18} />
            Gọi thử
          </button>

          <button
            type="submit"
            disabled={!writable || busy || !ready || token === ""}
            className="h-9 rounded-full bg-chip-active px-4 text-sm font-medium text-chip-active-fg transition hover:opacity-90 disabled:opacity-40"
          >
            Lưu nguồn
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-fg">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-fg/40 disabled:opacity-50"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
