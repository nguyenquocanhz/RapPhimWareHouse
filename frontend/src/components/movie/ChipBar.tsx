"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

export interface Chip {
  label: string;
  href: string;
  active?: boolean;
}

/** Moi lan bam cuon di khoang chung nay be ngang, chua het de con thay diem noi. */
const SCROLL_RATIO = 0.8;

/**
 * Dai chip loc cuon ngang dat ngay duoi thanh dieu huong,
 * dung dung vai tro nhu hang chip goi y cua YouTube.
 *
 * <p>Thanh cuon bi an di cho gon, nen phai co nut mui ten thay the: tren may ban
 * khong co man hinh cham, an thanh cuon ma khong co nut la chip bi cat cut o mep ma
 * khong co cach nao voi toi. Nut chi hien ve phia con cuon duoc.</p>
 */
export function ChipBar({ chips }: { chips: Chip[] }) {
  const track = useRef<HTMLUListElement>(null);

  // Con cuon duoc ve phia nao. Suy ra tu vi tri cuon that chu khong doan truoc,
  // vi so chip va be ngang man hinh deu thay doi.
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const element = track.current;
    if (!element) return;

    const max = element.scrollWidth - element.clientWidth;
    // Chua mot chut sai so: cuon toi cuoi thuong lech vai phan muoi pixel.
    setEdges({ left: element.scrollLeft > 4, right: element.scrollLeft < max - 4 });
  }, []);

  // Doi trang thi danh sach chip doi theo, phai do lai tu dau.
  const signature = chips.map((chip) => chip.href).join("|");

  useEffect(() => {
    const element = track.current;
    if (!element) return;

    // ResizeObserver goi callback ngay lan dau khi bat dau theo doi, nho vay co
    // duoc so do ban dau ma khong phai dat state ngay trong than effect.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [measure, signature]);

  function scrollBy(direction: 1 | -1) {
    const element = track.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * SCROLL_RATIO, behavior: "smooth" });
  }

  if (chips.length === 0) return null;

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-6 bg-canvas px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="relative">
        <ul ref={track} className="no-scrollbar flex gap-3 overflow-x-auto">
          {chips.map((chip) => (
            // Hai chip khac nhau co the tro ve cung mot duong dan (vi du chip
            // "Moi cap nhat" va chip "Nguon KKPhim" o trang chu) nen key gom ca nhan.
            <li key={`${chip.label}|${chip.href}`} className="shrink-0">
              <Link
                href={chip.href}
                aria-current={chip.active ? "page" : undefined}
                className={`inline-block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  chip.active
                    ? "bg-chip-active font-medium text-chip-active-fg"
                    : "bg-chip text-fg hover:bg-chip-hover"
                }`}
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>

        <Edge side="left" show={edges.left} onClick={() => scrollBy(-1)} />
        <Edge side="right" show={edges.right} onClick={() => scrollBy(1)} />
      </div>
    </div>
  );
}

/**
 * Nut cuon kem dai mo dan o mep.
 *
 * <p>Dai mo dan quan trong khong kem gi nut: no cho thay chip bi cat la do con noi
 * dung phia sau chu khong phai giao dien hong.</p>
 */
function Edge({
  side,
  show,
  onClick,
}: {
  side: "left" | "right";
  show: boolean;
  onClick: () => void;
}) {
  if (!show) return null;

  const left = side === "left";

  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 w-16 ${
          left ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"
        } from-canvas via-canvas/80 to-transparent`}
      />
      <button
        type="button"
        onClick={onClick}
        aria-label={left ? "Xem các mục trước" : "Xem thêm các mục"}
        className={`absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-surface text-fg shadow-md transition hover:bg-surface-hover ${
          left ? "left-0" : "right-0"
        }`}
      >
        {left ? (
          <ChevronLeftIcon width={18} height={18} />
        ) : (
          <ChevronRightIcon width={18} height={18} />
        )}
      </button>
    </>
  );
}
