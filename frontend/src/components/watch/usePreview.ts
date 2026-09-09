"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Anh xem truoc khi re chuot tren thanh tien do.
 *
 * KKPhim khong kem sprite hay WebVTT thumbnail nen phai tu dung: mot the <video> an
 * dung chung link HLS, tua toi giay dang re roi ve khung hinh do len <canvas>.
 *
 * Phai la mot instance hls.js rieng chu khong dung lai cua trinh phat chinh: tua qua
 * tua lai tren luong dang chieu se lam nguoi xem giat hinh.
 */

/** Anh nho thi tua nhanh va ton it bang thong; 160x90 vua du de nhan ra canh. */
export const PREVIEW_WIDTH = 160;
export const PREVIEW_HEIGHT = 90;

/** Re chuot sinh hang tram su kien mot giay, gom lai roi tua mot lan. */
const SEEK_DEBOUNCE_MS = 80;

/** Lech duoi nguong nay thi khung hinh coi nhu khong doi, khoi tua lai. */
const SEEK_EPSILON_S = 0.4;

export interface Preview {
  /**
   * Gan vao thuoc tinh `ref` cua the <canvas>.
   *
   * La mot ham chu khong phai doi tuong ref: tra ve ref thi ca cum gia tri nay bi
   * coi la ref, va doc `hasFrame` luc render se thanh loi lint.
   */
  setCanvas: (node: HTMLCanvasElement | null) => void;
  /** Da ve duoc khung hinh cua dung luong nay chua. */
  hasFrame: boolean;
  /** Bat duong ong xem truoc, goi khi con tro vua cham vao thanh tien do. */
  start: () => void;
  /** Xin khung hinh tai giay nay. */
  request: (seconds: number) => void;
}

export function usePreview(src: string | null): Preview {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const debounce = useRef<number | null>(null);
  const wanted = useRef<number | null>(null);

  const [enabled, setEnabled] = useState(false);

  // Ghi lai da ve khung hinh cho luong nao, thay vi mot co boolean. Doi tap la
  // `src` doi theo nen co tu het hieu luc, khong phai don dep trong cleanup.
  const [drawnFor, setDrawnFor] = useState<string | null>(null);

  const start = useCallback(() => setEnabled(true), []);

  const setCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
  }, []);

  // Chi dung tai nguyen khi nguoi dung that su re chuot len thanh tien do: mo phim
  // roi xem thang mot mach thi khong ton them ket noi nao.
  useEffect(() => {
    if (!enabled || !src || !Hls.isSupported()) return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    videoRef.current = video;

    const hls = new Hls({
      enableWorker: false,
      // Muc thap nhat va bo dem ngan: anh 160px khong can net, va phai nhuong bang
      // thong cho luong dang chieu.
      startLevel: 0,
      maxBufferLength: 4,
      backBufferLength: 0,
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hls.currentLevel = 0;
      // Con tro co the da re truoc khi manifest ve kip.
      const at = wanted.current;
      if (at !== null && Number.isFinite(at)) {
        video.currentTime = at;
      }
    });

    const draw = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setDrawnFor(src);
    };

    video.addEventListener("seeked", draw);
    video.addEventListener("loadeddata", draw);

    hls.attachMedia(video);
    hls.loadSource(src);

    return () => {
      video.removeEventListener("seeked", draw);
      video.removeEventListener("loadeddata", draw);
      hls.destroy();
      videoRef.current = null;
    };
  }, [enabled, src]);

  useEffect(() => {
    return () => {
      if (debounce.current !== null) {
        window.clearTimeout(debounce.current);
        debounce.current = null;
      }
    };
  }, []);

  const request = useCallback((seconds: number) => {
    wanted.current = seconds;
    if (debounce.current !== null) return;

    debounce.current = window.setTimeout(() => {
      debounce.current = null;

      const video = videoRef.current;
      const at = wanted.current;
      if (!video || at === null || !Number.isFinite(at)) return;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (Math.abs(video.currentTime - at) < SEEK_EPSILON_S) return;

      video.currentTime = Math.min(Math.max(at, 0), video.duration);
    }, SEEK_DEBOUNCE_MS);
  }, []);

  return { setCanvas, hasFrame: src !== null && drawnFor === src, start, request };
}
