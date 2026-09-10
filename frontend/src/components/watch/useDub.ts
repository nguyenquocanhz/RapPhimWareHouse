"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Mot cau thuyet minh: moc gio + duong audio da sinh. */
export interface DubCue {
  start: number;
  end: number;
  text: string;
  text_src?: string;
  audio?: string;
}

export type DubStatus = "idle" | "working" | "ready" | "error";

export interface DubProgress {
  phase: string; // ocr | translate | tts
  done: number;
  total: number;
}

export interface DubOptions {
  engine?: string; // edge | piper
  voice?: string;
  fps?: number;
  translate_engine?: string;
}

/** Ha am goc xuong lam nen khi dang co giong thuyet minh, kieu phim thuyet minh. */
const DUCK = 0.22;

/**
 * Quan ly che do thuyet minh cho mot luong phim: goi dich vu dub sinh giong (OCR -> dich
 * -> TTS), theo doi tien do, roi phat cac cau audio dong bo theo the &lt;video&gt; va ha
 * am goc lam nen. Toan bo phat lam o phia client, khong tron lai luong o may chu.
 */
export function useDub(videoRef: React.RefObject<HTMLVideoElement | null>, streamUrl: string) {
  const [status, setStatus] = useState<DubStatus>("idle");
  const [progress, setProgress] = useState<DubProgress | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuesRef = useRef<DubCue[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<number>(-1);
  const baseVolumeRef = useRef<number>(1);
  const cancelRef = useRef(false);

  // The audio an de phat giong thuyet minh.
  useEffect(() => {
    if (typeof Audio === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  const start = useCallback(
    async (opts: DubOptions = {}) => {
      setError(null);
      setStatus("working");
      setProgress({ phase: "ocr", done: 0, total: 0 });
      cancelRef.current = false;
      try {
        const res = await fetch("/api/dub/from-video", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: streamUrl, ...opts }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string };
          throw new Error(body.detail ?? "Không tạo được thuyết minh.");
        }
        const { jobId } = (await res.json()) as { jobId: string };

        while (!cancelRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const job = (await fetch(`/api/dub/${jobId}`).then((r) => r.json())) as {
            status: string;
            phase?: string;
            done?: number;
            total?: number;
            error?: string;
            cues?: DubCue[];
          };
          setProgress({ phase: job.phase ?? job.status, done: job.done ?? 0, total: job.total ?? 0 });
          if (job.status === "done") {
            cuesRef.current = (job.cues ?? []).filter((cue) => cue.audio);
            setStatus("ready");
            setEnabled(true);
            return;
          }
          if (job.status === "error") {
            throw new Error(job.error ?? "Lỗi khi tạo thuyết minh.");
          }
        }
      } catch (exception) {
        setError(exception instanceof Error ? exception.message : "Lỗi thuyết minh.");
        setStatus("error");
      }
    },
    [streamUrl],
  );

  const stop = useCallback(() => {
    cancelRef.current = true;
    setEnabled(false);
    setStatus("idle");
    setProgress(null);
    setError(null);
    cuesRef.current = [];
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (status === "ready") setEnabled((value) => !value);
  }, [status]);

  // Dong bo phat giong + ha am goc khi che do thuyet minh bat.
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    if (!enabled || status !== "ready") {
      audio.pause();
      activeRef.current = -1;
      return;
    }

    baseVolumeRef.current = video.volume;
    video.volume = baseVolumeRef.current * DUCK;

    const sync = () => {
      const time = video.currentTime;
      // Cong them mot chut duoi de audio dai hon cue van kip noi het.
      const index = cuesRef.current.findIndex((cue) => time >= cue.start && time < cue.end + 0.4);
      if (index === activeRef.current) return;
      activeRef.current = index;
      if (index >= 0 && cuesRef.current[index].audio) {
        audio.src = cuesRef.current[index].audio as string;
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
      } else {
        audio.pause();
      }
    };
    const onPause = () => audio.pause();
    const onResume = () => {
      if (activeRef.current >= 0) audio.play().catch(() => undefined);
    };
    const onSeeking = () => {
      audio.pause();
      activeRef.current = -1;
    };
    const onRate = () => {
      audio.playbackRate = video.playbackRate;
    };

    audio.playbackRate = video.playbackRate;
    video.addEventListener("timeupdate", sync);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onResume);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("ratechange", onRate);

    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onResume);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("ratechange", onRate);
      audio.pause();
      video.volume = baseVolumeRef.current;
    };
  }, [enabled, status, videoRef]);

  return { status, progress, enabled, error, start, stop, toggle };
}
