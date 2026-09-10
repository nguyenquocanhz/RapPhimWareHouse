"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Phan logic cua trinh phat: nap HLS, theo doi trang thai the <video>
 * va cung cap cac ham dieu khien. Tach rieng khoi phan giao dien de
 * component controls chi lo viec ve.
 */

export interface PlayerState {
  playing: boolean;
  waiting: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  /** Cac muc chat luong HLS, rong neu luong khong chia muc. */
  levels: Array<{ index: number; label: string }>;
  /** -1 nghia la tu dong chon theo bang thong. */
  level: number;
  error: string | null;
}

const INITIAL: PlayerState = {
  playing: false,
  waiting: true,
  ended: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  muted: false,
  rate: 1,
  levels: [],
  level: -1,
  error: null,
};

/**
 * Trinh duyet co tu phat duoc HLS khong (Safari, iOS).
 *
 * Khong duoc tin ham nay de quyet dinh co dung hls.js hay khong: Chromium tra ve
 * "maybe" cho kieu MIME cua HLS nhung that ra khong phat duoc, gan thang link .m3u8
 * vao the <video> se hong voi loi MEDIA_ERR_SRC_NOT_SUPPORTED. Vi vay luon uu tien
 * hls.js truoc, chi roi ve duong nay khi hls.js khong chay duoc.
 */
function playsHlsNatively(video: HTMLVideoElement): boolean {
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

/**
 * Kieu nguon phat.
 *
 * <p>Khong tu doan tu duoi file: duong phat cua kho rieng la duong ky co han, duoi
 * file bi chuoi tham so che mat. Tang tren biet ro minh dang cam gi nen truyen thang
 * xuong.</p>
 */
export type SourceKind = "hls" | "file";

export function usePlayer(src: string | null, kind: SourceKind = "hls") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<PlayerState>(INITIAL);

  const patch = useCallback((changes: Partial<PlayerState>) => {
    setState((current) => {
      // Bo qua cap nhat rong: su kien `progress` / `timeupdate` ban ra rat day, neu
      // lan nao cung tao object moi thi trinh phat render lai lien tuc du chang doi gi.
      // Tra ve dung tham chieu cu de React bo qua vong render.
      let changed = false;
      for (const key in changes) {
        if (current[key as keyof PlayerState] !== changes[key as keyof PlayerState]) {
          changed = true;
          break;
        }
      }
      return changed ? { ...current, ...changes } : current;
    });
  }, []);

  // Nap nguon phat.
  //
  // hls.js duoc import tinh chu khong import dong: ban dong bo tung khien viec gan
  // nguon xay ra sau khi effect da bi don dep, va the <video> ket o trang thai rong.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setState({ ...INITIAL });

    // File roi (mp4/mkv cua kho rieng) thi gan thang, khong dinh dang toi hls.js.
    if (kind === "file") {
      video.src = src;
      video.load();
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      if (playsHlsNatively(video)) {
        video.src = src;
        return;
      }
      patch({ error: "Trình duyệt không phát được luồng HLS." });
      return;
    }

    const hls = new Hls({
      // Chay giai ma / ghep luong tren worker rieng thay vi luong chinh. Truoc day tat,
      // la nguyen nhan chinh gay giat: moi doan luong xu ly ngay tren luong chinh, chan
      // ca viec ve giao dien. Bat len thi phat muot va dieu khien khong lag.
      enableWorker: true,
      // Dem truoc nhieu hon (mac dinh 30s) de it khi phai dung cho tai giua chung.
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      // Nhung chi giu 90s da xem phia sau, tranh phinh RAM lam lag dan tren tap dai.
      backBufferLength: 90,
      // VOD khong can che do do tre thap; tat cho bot viec thua.
      lowLatencyMode: false,
    });
    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      patch({
        levels: data.levels.map((level, index) => ({
          index,
          label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`,
        })),
        level: hls.currentLevel,
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      patch({ level: hls.autoLevelEnabled ? -1 : data.level });
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      // Loi mang va loi giai ma thuong tu phuc hoi duoc, chi bo cuoc khi that su hong.
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        patch({ error: "Không tải được luồng phát. Thử đổi server hoặc tập khác." });
      }
    });

    hls.attachMedia(video);
    hls.loadSource(src);

    return () => {
      hls.destroy();
      if (hlsRef.current === hls) {
        hlsRef.current = null;
      }
    };
  }, [src, kind, patch]);

  // Bam theo trang thai that cua the <video> thay vi tu doan.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () =>
      patch({
        playing: !video.paused && !video.ended,
        ended: video.ended,
        currentTime: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        buffered: video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0,
        volume: video.volume,
        muted: video.muted,
        rate: video.playbackRate,
      });

    const onWaiting = () => patch({ waiting: true });
    const onPlaying = () => patch({ waiting: false, playing: true });
    const onError = () =>
      patch({
        waiting: false,
        error: "Không phát được tập này. Thử đổi server hoặc tập khác.",
      });

    const events = [
      "loadedmetadata",
      "timeupdate",
      "progress",
      "play",
      "pause",
      "ended",
      "volumechange",
      "ratechange",
      "seeked",
      "durationchange",
    ] as const;

    events.forEach((event) => video.addEventListener(event, sync));
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);
    video.addEventListener("error", onError);

    return () => {
      events.forEach((event) => video.removeEventListener(event, sync));
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
      video.removeEventListener("error", onError);
    };
  }, [patch]);

  // Tung ham deu chi thao tac tren the <video> qua ref nen khong co phu thuoc nao.
  const play = useCallback(() => videoRef.current?.play().catch(() => undefined), []);
  const pause = useCallback(() => videoRef.current?.pause(), []);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) ? video.duration : seconds;
    video.currentTime = Math.min(Math.max(seconds, 0), max);
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) ? video.duration : video.currentTime;
    video.currentTime = Math.min(Math.max(video.currentTime + delta, 0), max);
  }, []);

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.min(Math.max(value, 0), 1);
    video.muted = video.volume === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    // Bo tieng roi mo lai ma am luong dang 0 thi van khong nghe thay gi.
    if (!video.muted && video.volume === 0) {
      video.volume = 0.5;
    }
  }, []);

  const setRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
  }, []);

  const setLevel = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  }, []);

  /**
   * Phai memo hoa: mot object literal se doi tham chieu moi lan render, ma trinh phat
   * render lai theo tung `timeupdate`. Bat cu effect nao dat `controls` vao mang phu
   * thuoc se chay lai vai lan mot giay - dung nhu vay tinh nang nhay toi chuong tung
   * khoa cung nguoi xem tai dung mot moc, tua di dau cung bi keo nguoc ve.
   */
  const controls = useMemo(
    () => ({
      play,
      pause,
      toggle,
      seekTo,
      seekBy,
      setVolume,
      toggleMute,
      setRate,
      setLevel,
    }),
    [play, pause, toggle, seekTo, seekBy, setVolume, toggleMute, setRate, setLevel],
  );

  return { videoRef, state, controls };
}
