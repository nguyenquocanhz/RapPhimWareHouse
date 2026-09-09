"use client";

import { useCallback, useEffect, useState } from "react";

import { useLocalStorage } from "@/lib/browser-store";

/**
 * Khuech dai am luong va can bang tan so cho trinh phat.
 *
 * <p>Thanh am luong san cua the &lt;video&gt; chan tren o 100%. Nhieu ban phim -
 * nhat la ban thuyet minh tu lam - thu am nho hon han, van to het co cung khong nghe
 * ro. Duong di duy nhat de vuot qua muc do la Web Audio: dua tieng qua mot chuoi xu ly
 * roi moi ra loa.</p>
 *
 * <h2>Cai bay phai biet</h2>
 * <p>{@code createMediaElementSource} lam tieng cua the video <b>chi con di qua chuoi
 * xu ly</b>, khong ra thang loa nua. Neu nguon tieng khac goc voi trang va khong khai
 * bao CORS thi trinh duyet coi la du lieu cam, va ket qua la <b>im hoan toan</b> - hong
 * ma khong bao loi gi. Tra hon nua, goi ham do mot lan la khong go lai duoc.</p>
 *
 * <p>Nen chi bat khi chac chan an toan: luong HLS chay qua hls.js cho ra dia chi
 * {@code blob:} cung goc voi trang, con file roi cua kho rieng thi khac goc. Nguon nao
 * khong chac thi thoi, chu khong danh cuoc bang tieng cua nguoi xem.</p>
 */

/** Cac dai tan cua bo can bang, chon thua theo bo 6 dai quen thuoc. */
export const EQ_BANDS = [60, 230, 910, 3000, 6000, 14000] as const;

/** Muc chinh toi da cua moi dai, tinh bang dB. */
export const EQ_RANGE_DB = 12;

/** Khuech dai toi da. Qua muc nay thi meo tieng va hai tai chu khong ro them. */
export const MAX_BOOST = 3;

const BOOST_KEY = "rapphim.boost";
const EQ_KEY = "rapphim.eq";

const FLAT: number[] = EQ_BANDS.map(() => 0);

interface Graph {
  context: AudioContext;
  gain: GainNode;
  filters: BiquadFilterNode[];
}

/**
 * Chuoi xu ly gan voi chinh the &lt;video&gt;, khong gan voi component.
 *
 * <p>{@code createMediaElementSource} chi duoc goi mot lan cho moi the video - goi lan
 * hai la nem loi - va khong go lai duoc. Vay nen no la thuoc tinh cua the video chu
 * khong phai cua lan render nao; giu o day thi component co dung lai bao nhieu lan
 * cung khong dung toi lan hai. WeakMap de the video bi go la chuoi tu duoc thu don.</p>
 */
const GRAPHS = new WeakMap<HTMLVideoElement, Graph>();

export interface AudioPreset {
  id: string;
  label: string;
  bands: number[];
}

/**
 * Cac muc dat san.
 *
 * <p>Khong chep bua tu bo chinh cua may nghe nhac: moi muc o day nham dung mot canh
 * hay gap khi xem phim.</p>
 */
export const AUDIO_PRESETS: AudioPreset[] = [
  { id: "flat", label: "Chuẩn", bands: [0, 0, 0, 0, 0, 0] },
  // Keo dai giong noi len, ha bot am tram cua nhac nen va tieng no.
  { id: "voice", label: "Rõ lời thoại", bands: [-4, -2, 4, 6, 3, 0] },
  { id: "bass", label: "Bass mạnh", bands: [8, 5, 0, -1, 0, 2] },
  // Nghe khuya: bot tram cho do vang sang phong ben, giu giong noi.
  { id: "night", label: "Đêm khuya", bands: [-8, -4, 2, 4, 1, -2] },
];

export interface AudioChain {
  /** Nguon hien tai co dua qua Web Audio duoc khong. */
  supported: boolean;
  /** He so khuech dai, 1 la giu nguyen. */
  boost: number;
  setBoost: (value: number) => void;
  /** Muc chinh cua tung dai, tinh bang dB. */
  bands: number[];
  setBand: (index: number, db: number) => void;
  applyPreset: (preset: AudioPreset) => void;
  /** Dang khac muc mac dinh hay khong, de danh dau tren nut cai dat. */
  active: boolean;
}

function parseBoost(value: unknown): number | null {
  return typeof value === "number" && value >= 1 && value <= MAX_BOOST ? value : null;
}

function parseBands(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== EQ_BANDS.length) return null;
  return value.every((item) => typeof item === "number" && Math.abs(item) <= EQ_RANGE_DB)
    ? (value as number[])
    : null;
}

/**
 * Nguon tieng co cung goc voi trang khong.
 *
 * <p>{@code blob:} la dia chi do chinh trang tao ra (hls.js dung MediaSource) nen luon
 * cung goc. Ngoai ra chi chap nhan dia chi cung goc that.</p>
 */
function sameOrigin(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("blob:")) return true;
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function useAudioChain(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  src: string | null,
): AudioChain {
  const [boost, setBoost] = useLocalStorage<number>(BOOST_KEY, 1, parseBoost);
  const [bands, setBands] = useLocalStorage<number[]>(EQ_KEY, FLAT, parseBands);

  const [supported, setSupported] = useState(false);

  /**
   * Dung chuoi xu ly, goi tu thao tac that cua nguoi dung.
   *
   * <p>Phai co thao tac nguoi dung truoc: trinh duyet khong cho mo AudioContext trong
   * lan tai trang dau tien.</p>
   */
  const build = useCallback((): Graph | null => {
    const video = videoRef.current;
    if (!video) return null;

    const existing = GRAPHS.get(video);
    if (existing) return existing;
    if (!sameOrigin(video.currentSrc || video.src)) return null;

    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(video);

      const filters = EQ_BANDS.map((frequency) => {
        const filter = context.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = frequency;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      const gain = context.createGain();
      gain.gain.value = 1;

      // Chan tren o 0 dB: khuech dai manh ma khong co cai nay thi tieng vo, nhat la
      // o cac doan on ao. Muc thuong khong cham toi nen khong lam doi tieng goc.
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = 0;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;

      const chain: AudioNode[] = [source, ...filters, gain, limiter];
      for (let index = 0; index < chain.length - 1; index++) {
        chain[index].connect(chain[index + 1]);
      }
      limiter.connect(context.destination);

      const graph: Graph = { context, gain, filters };
      GRAPHS.set(video, graph);
      return graph;
    } catch {
      // Trinh duyet tu choi (thuong la do nguon khac goc) - de nguyen duong tieng cu.
      return null;
    }
  }, [videoRef]);

  // Doi tap thi kiem lai xem nguon moi co dung duoc khong.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const check = () => setSupported(sameOrigin(video.currentSrc || video.src));

    video.addEventListener("loadedmetadata", check);
    video.addEventListener("emptied", check);
    // Nguon co the da san sang truoc khi gan doi tuong theo doi.
    const timer = window.setTimeout(check, 0);

    return () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("emptied", check);
    };
  }, [videoRef, src]);

  const apply = useCallback(
    (nextBoost: number, nextBands: number[]) => {
      const graph = build();
      if (!graph) return;

      // Trinh duyet tam dung AudioContext cho toi khi co thao tac nguoi dung.
      if (graph.context.state === "suspended") {
        graph.context.resume().catch(() => undefined);
      }
      graph.gain.gain.value = nextBoost;
      graph.filters.forEach((filter, index) => {
        filter.gain.value = nextBands[index] ?? 0;
      });
    },
    [build],
  );

  /**
   * Doi tap thi phai ap lai muc da luu.
   *
   * <p>Chuoi xu ly song theo the video nen doi tap khong lam no mat, nhung neu nguoi
   * dung chinh o tap truoc roi mo tap khac thi phai dat lai cho dung.</p>
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !GRAPHS.has(video)) return;
    apply(boost, bands);
  }, [src, apply, boost, bands, videoRef]);

  const changeBoost = useCallback(
    (value: number) => {
      const next = Math.min(Math.max(value, 1), MAX_BOOST);
      setBoost(next);
      apply(next, bands);
    },
    [apply, bands, setBoost],
  );

  const setBand = useCallback(
    (index: number, db: number) => {
      const next = bands.map((value, position) =>
        position === index ? Math.min(Math.max(db, -EQ_RANGE_DB), EQ_RANGE_DB) : value,
      );
      setBands(next);
      apply(boost, next);
    },
    [apply, bands, boost, setBands],
  );

  const applyPreset = useCallback(
    (preset: AudioPreset) => {
      setBands(preset.bands);
      apply(boost, preset.bands);
    },
    [apply, boost, setBands],
  );

  return {
    supported,
    boost,
    setBoost: changeBoost,
    bands,
    setBand,
    applyPreset,
    active: boost > 1 || bands.some((value) => value !== 0),
  };
}
