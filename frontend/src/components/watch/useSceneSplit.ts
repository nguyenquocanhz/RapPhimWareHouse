"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tu chia chuong theo cho chuyen canh.
 *
 * Cach lam khong phai giai ma video ma doc chinh danh sach phat HLS.
 *
 * Bo ma hoa cua nguon dat khung hinh khoa o dung cho chuyen canh (scene-cut
 * keyframe), va moi doan .ts luon bat dau bang mot khung khoa. Vi vay do dai cac
 * doan khong deo nhau: do doan 43 phut cua "Doi Chung" co 656 doan dai tu 0.16 den
 * 7.64 giay. Moi ranh gioi doan chinh la mot cu cat canh that, va ca danh sach chi
 * nang khoang 30KB.
 *
 * Da thu huong khac - cho mot the <video> an chay 16x roi so tung khung hinh kieu
 * PySceneDetect - va do duoc: luong nay chi co dung mot muc 1080p 3.5Mbps, quet het
 * mot tap se tai khoang 1.1GB, con giai ma thi chay duoc 0.19x chu khong phai 16x.
 * Khong dang, nen bo.
 *
 * Doi lai, cach nay khong hieu noi dung: no biet cho nao cat canh chu khong biet
 * canh do ke chuyen gi, nen ten chuong chi dat tam va nguoi dung nen sua lai.
 */

/** Khong sinh qua nhieu muc, danh sach dai qua thi cung nhu khong chia. */
const MAX_MARKS = 12;

/** Hai chuong khong duoc sat hon khoang nay. */
const MIN_GAP_FLOOR_S = 90;

export type SplitStatus = "idle" | "working" | "done" | "error";

export interface SceneSplit {
  status: SplitStatus;
  /** So moc lan chia gan nhat tim duoc. */
  found: number;
  /**
   * Nguon nay co that su cat doan theo canh khong.
   *
   * Mot so nguon cat deo dung 4 giay mot doan bat ke noi dung; luc do ranh gioi doan
   * khong con y nghia gi va cac moc chi la chia deu. Phai noi ro chu khong duoc de
   * nguoi dung tuong la may vua hieu duoc noi dung phim.
   */
  fromRealCuts: boolean;
  error: string | null;
  run: () => void;
}

interface Cut {
  at: number;
  /** Doan lang truoc va sau cu cat: cang dai cang giong mot cho ngat tu nhien. */
  score: number;
}

async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Nguồn trả về ${response.status}`);
  return response.text();
}

/**
 * Doc danh sach phat va tra ve moi cho cat canh.
 *
 * Duong dan dau tien co the la danh sach tong (chi tro toi cac muc chat luong),
 * luc do phai lan them mot cap nua moi toi danh sach chua cac doan.
 */
async function loadCuts(
  src: string,
  signal: AbortSignal,
): Promise<{ cuts: Cut[]; total: number; varied: boolean }> {
  let url = src;
  let text = await fetchText(url, signal);

  if (!text.includes("#EXTINF")) {
    const variant = text.split(/\r?\n/).find((line) => line.trim() && !line.startsWith("#"));
    if (!variant) throw new Error("Danh sách phát không có mục nào.");
    url = new URL(variant.trim(), url).href;
    text = await fetchText(url, signal);
  }

  const durations = [...text.matchAll(/#EXTINF:([0-9.]+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (durations.length < 4) throw new Error("Danh sách phát không đủ dữ liệu để chia.");

  const cuts: Cut[] = [];
  let elapsed = 0;
  for (let index = 0; index < durations.length; index += 1) {
    elapsed += durations[index];
    // Doan cuoi khong tinh: het phim khong phai mot cho chuyen canh.
    if (index < durations.length - 1) {
      cuts.push({ at: elapsed, score: durations[index] + durations[index + 1] });
    }
  }

  // Do lech chuan cua do dai doan. Gan 0 nghia la nguon cat deo theo dong ho chu
  // khong theo canh, luc do khong con tin hieu nao de dua vao.
  const mean = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const variance =
    durations.reduce((sum, value) => sum + (value - mean) ** 2, 0) / durations.length;

  return { cuts, total: elapsed, varied: Math.sqrt(variance) > 0.15 };
}

/**
 * Chon cac cho cat dang lam moc chuong: uu tien cho lang nhat, va giu khoang cach
 * de cac muc trai deu ca tap thay vi dinh vao mot doan.
 */
function pickMarks(cuts: Cut[], total: number): number[] {
  const gap = Math.max(MIN_GAP_FLOOR_S, total / (MAX_MARKS + 2));
  const chosen: Cut[] = [];

  for (const cut of [...cuts].sort((a, b) => b.score - a.score)) {
    if (chosen.length >= MAX_MARKS) break;
    // Bo qua doan dau (thuong la gioi thieu) va doan ket.
    if (cut.at < gap || cut.at > total - gap / 2) continue;
    if (chosen.some((picked) => Math.abs(picked.at - cut.at) < gap)) continue;
    chosen.push(cut);
  }

  return chosen.sort((a, b) => a.at - b.at).map((cut) => Math.round(cut.at));
}

export function useSceneSplit(src: string | null, onDetected: (cuts: number[]) => void): SceneSplit {
  const [status, setStatus] = useState<SplitStatus>("idle");
  const [found, setFound] = useState(0);
  const [fromRealCuts, setFromRealCuts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const running = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      running.current?.abort();
      running.current = null;
    };
  }, []);

  const run = useCallback(() => {
    if (!src) {
      setStatus("error");
      setError("Tập này không có luồng để đọc.");
      return;
    }

    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;

    setStatus("working");
    setError(null);

    loadCuts(src, controller.signal)
      .then(({ cuts, total, varied }) => {
        if (controller.signal.aborted) return;
        const marks = pickMarks(cuts, total);
        setFound(marks.length);
        setFromRealCuts(varied);
        setStatus("done");
        onDetected(marks);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          cause instanceof Error ? `Không đọc được danh sách phát: ${cause.message}` : "Không chia được.",
        );
      });
  }, [src, onDetected]);

  return { status, found, fromRealCuts, error, run };
}
