"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

/**
 * Anh khung hinh cho tung chuong.
 *
 * Dung lai cach cua anh xem truoc: mot the <video> an rieng, tua toi giay cua tung
 * chuong roi ve khung hinh do len <canvas>. Khac o cho anh duoc giu lai de hien canh
 * moi dong trong bang chuong, thay vi ve mot lan roi thoi.
 *
 * Anh chi song trong phien nay, khong ghi vao localStorage: moi anh vai KB nhung
 * nhieu tap cong lai se lam day cho luu tru cua ca ung dung.
 */

/** Ve o kich thuoc nay roi thu nho khi hien, cho do ro tren man hinh net cao. */
const THUMB_W = 160;
const THUMB_H = 90;

export type ChapterThumbs = Record<number, string>;

const EMPTY: ChapterThumbs = {};

/** Anh luon di kem luong da ve ra chung, de doi tap la ca cum tu het hieu luc. */
interface Store {
  src: string | null;
  map: ChapterThumbs;
}

export function useChapterThumbs(src: string | null, times: number[]): ChapterThumbs {
  // Gan luong vao ngay trong state thay vi xoa bang mot effect rieng: dat lai state
  // ngay trong than effect la dieu React khong cho, ma o day cung khong can - chi so
  // luong la biet cum anh cu con dung hay khong.
  const [store, setStore] = useState<Store>({ src: null, map: EMPTY });

  // Giu ban sao trong ref de effect khong phai phu thuoc vao chinh ket qua cua no.
  const cache = useRef<Store>({ src: null, map: EMPTY });

  // Chuoi on dinh cua danh sach giay: mang moi lan render la mot tham chieu khac,
  // dat thang vao mang phu thuoc se lam effect chay lai lien tuc.
  const key = times.join(",");

  useEffect(() => {
    if (!src || !Hls.isSupported()) return;

    // Doi tap thi bo het anh cu. Ghi vao ref trong effect duoc, khac voi setState.
    if (cache.current.src !== src) {
      cache.current = { src, map: EMPTY };
    }

    const wanted = key
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((at) => Number.isFinite(at) && !(at in cache.current.map));

    if (wanted.length === 0) return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const hls = new Hls({
      enableWorker: false,
      startLevel: 0,
      maxBufferLength: 4,
      backBufferLength: 0,
    });

    const canvas = document.createElement("canvas");
    canvas.width = THUMB_W;
    canvas.height = THUMB_H;
    const context = canvas.getContext("2d");

    let index = 0;
    let cancelled = false;

    const close = () => {
      video.removeEventListener("seeked", onSeeked);
      hls.destroy();
    };

    const next = () => {
      if (cancelled) return;
      if (index >= wanted.length) {
        close();
        return;
      }
      video.currentTime = wanted[index];
    };

    function onSeeked() {
      if (cancelled || !context) return;

      const at = wanted[index];
      context.drawImage(video, 0, 0, THUMB_W, THUMB_H);
      cache.current = {
        src,
        map: { ...cache.current.map, [at]: canvas.toDataURL("image/jpeg", 0.6) },
      };
      setStore(cache.current);

      index += 1;
      next();
    }

    video.addEventListener("seeked", onSeeked);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // Anh be xiu nen khong can muc chat luong cao.
      hls.currentLevel = 0;
      next();
    });

    hls.attachMedia(video);
    hls.loadSource(src);

    return () => {
      cancelled = true;
      close();
    };
  }, [src, key]);

  return store.src === src ? store.map : EMPTY;
}
