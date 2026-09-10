"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DefaultViewIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  NextEpisodeIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  RotateScreenIcon,
  PreviousEpisodeIcon,
  ReplayIcon,
  SeekBackIcon,
  SeekForwardIcon,
  SettingsIcon,
  SubtitleIcon,
  TheaterIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMutedIcon,
} from "@/components/ui/icons";
import {
  AUDIO_PRESETS,
  EQ_BANDS,
  EQ_RANGE_DB,
  MAX_BOOST,
  useAudioChain,
  type AudioChain,
} from "@/components/watch/useAudioChain";
import { usePlayer, type SourceKind } from "@/components/watch/usePlayer";
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  usePreview,
} from "@/components/watch/usePreview";
import { useHydrated, useLocalStorage } from "@/lib/browser-store";
import type { Chapter } from "@/lib/library";
import type { Subtitle } from "@/lib/types";

interface VideoPlayerProps {
  src: string;
  title: string;
  /** Vi tri bat dau, dung de xem tiep dung cho. */
  startAt?: number;
  onProgress?: (seconds: number, duration: number) => void;
  theater: boolean;
  onToggleTheater: () => void;
  onNext?: () => void;
  /** Ve tap truoc. Khong truyen nghia la dang o tap dau. */
  onPrevious?: () => void;
  /** Goi khi luong khong phat duoc, de tang tren roi ve trinh phat cua nguon. */
  onUnplayable?: () => void;
  /** Anh dai dien, hien trong luc cho luong tai ve. */
  poster?: string | null;
  /** Giay ket thuc doan gioi thieu da hoc duoc cua bo phim nay, 0 la chua biet. */
  introEnd?: number;
  /** Dat hoac xoa moc gioi thieu cua bo phim. */
  onSetIntro?: (seconds: number | null) => void;
  /** Chuong cua tap dang xem, da sap theo thoi gian. */
  chapters?: Chapter[];
  /** Yeu cau nhay toi mot giay, gui tu danh sach chuong ben ngoai khung phat. */
  seekRequest?: { at: number; id: number } | null;
  /** HLS hay file roi. Kho rieng de nguyen mp4/mkv nen phai gan thang vao the video. */
  sourceKind?: SourceKind;
  /** Cac duong phu de roi; chi kho rieng moi co, hai nguon cong cong luon rong. */
  subtitles?: Subtitle[];
  /**
   * Dang o tap thu may tren tong so, vi du "Tap 5/24".
   *
   * Hien ngay trong khung phat de khong phai keo xuong danh sach tap moi biet.
   */
  episodeLabel?: string | null;
  /** Ten tap ke tiep, hien tren man hinh het tap de biet sap xem gi. */
  nextEpisodeName?: string | null;
}

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Cac buoc tua nhanh cho nguoi dung chon, tinh bang giay. */
const SEEK_STEPS = [5, 10, 15, 30];
const HIDE_DELAY_MS = 2600;

/** Qua khoang nay ma chua doc duoc thoi luong thi coi nhu luong khong phat duoc. */
const UNPLAYABLE_TIMEOUT_MS = 7000;

/** Het tap thi cho bay nhieu giay truoc khi tu sang tap ke. */
const AUTO_NEXT_SECONDS = 5;

/**
 * {@code ScreenOrientation.lock} chua co trong lib DOM cua TypeScript ban nay, trong
 * khi moi trinh duyet di dong deu co. Khai bao lai dung phan can dung thay vi ha muc
 * kiem tra kieu cua ca tep.
 */
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

function lockableOrientation(): LockableOrientation | null {
  if (typeof screen === "undefined" || !screen.orientation) return null;
  return screen.orientation as LockableOrientation;
}

/** Chi de nut bo qua trong phan dau tap, qua doan nay thi khong con y nghia. */
const INTRO_WINDOW_S = 300;

/** Mot lan tua nhay it nhat bay nhieu giay moi duoc coi la dang bo qua gioi thieu. */
const MIN_SKIP_JUMP_S = 20;

/** Ghi lai am luong de lan sau mo phim khong bi giat minh. */
const VOLUME_KEY = "rapphim.volume";

/** Buoc tua nhanh, ap dung cho moi phim chu khong rieng bo nao. */
const SEEK_STEP_KEY = "rapphim.seekstep";

/** Co tu chuyen sang tap ke khi het tap hay khong. Ap dung cho moi phim. */
const AUTOPLAY_KEY = "rapphim.autoplay";

type Panel = "root" | "rate" | "quality" | "intro" | "seek" | "subtitle" | "audio";

interface Nudge {
  id: number;
  seconds: number;
}

/** Thong bao ngan trong khung phat, kem mot hanh dong hoan tac neu can. */
interface Toast {
  id: number;
  text: string;
  undo?: () => void;
  /** Thoi gian hien, mac dinh {@link TOAST_MS}. */
  ms?: number;
}

/** Du lau de doc xong cau va voi tay bam Hoan tac. */
const TOAST_MS = 6000;

/** Loi xac nhan sau khi hoan tac thi ngan thoi, chi de biet la da nhan duoc. */
const CONFIRM_MS = 1800;

/** Khop voi thoi gian cua .player-toast-leaving trong globals.css. */
const TOAST_FADE_MS = 220;

export function VideoPlayer({
  src,
  title,
  startAt = 0,
  onProgress,
  theater,
  onToggleTheater,
  onNext,
  onPrevious,
  onUnplayable,
  poster,
  introEnd = 0,
  onSetIntro,
  chapters,
  seekRequest,
  sourceKind = "hls",
  subtitles,
  episodeLabel,
  nextEpisodeName,
}: VideoPlayerProps) {
  const { videoRef, state, controls } = usePlayer(src, sourceKind);
  const {
    setCanvas: setPreviewCanvas,
    hasFrame: previewReady,
    start: startPreview,
    request: requestPreview,
  } = usePreview(src);
  const shellRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [visible, setVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Dang khoa huong ngang hay khong. Khai bao canh `fullscreen` vi hai thu di lien
  // nhau: thoat toan man hinh la trinh duyet bo luon khoa huong.
  const [rotated, setRotated] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [toastHeld, setToastHeld] = useState(false);

  // Cai chop tron o giua moi lan phat / tam dung, giong YouTube. Chi la phan nhin,
  // khong dinh gi toi logic phat.
  const [flash, setFlash] = useState<{ id: number; playing: boolean } | null>(null);

  const [savedVolume, setSavedVolume] = useLocalStorage<number>(
    VOLUME_KEY,
    1,
    (value) => (typeof value === "number" && value >= 0 && value <= 1 ? value : null),
  );

  const [seekStep, setSeekStep] = useLocalStorage<number>(SEEK_STEP_KEY, 10, (value) =>
    typeof value === "number" && SEEK_STEPS.includes(value) ? value : null,
  );

  // Tu chuyen tap khi het, mac dinh bat. Nho qua localStorage cho moi phim.
  const [autoplayNext, setAutoplayNext] = useLocalStorage<boolean>(
    AUTOPLAY_KEY,
    true,
    (value) => (typeof value === "boolean" ? value : null),
  );

  const audio = useAudioChain(videoRef, src);

  // ------------------------------------------------------------ anh trong anh

  /**
   * Trinh duyet co ho tro anh trong anh khong.
   *
   * <p>Suy ra sau khi hydrate chu khong doc {@code document} ngay luc render: phia
   * server khong co {@code document}, doc som se lam HTML hai ben lech nhau.</p>
   */
  const hydrated = useHydrated();
  const pipSupported = hydrated && document.pictureInPictureEnabled;

  const [pip, setPip] = useState(false);

  // Nguoi dung co the dong cua so noi bang nut cua chinh trinh duyet, nen phai nghe
  // su kien cua the video thay vi tu ghi nho trang thai luc bam.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnter = () => setPip(true);
    const onLeave = () => setPip(false);

    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);

    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [videoRef]);

  const togglePip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const request = document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : video.requestPictureInPicture();

    // Trinh duyet co the tu choi (chua co thao tac nguoi dung, hoac dang toan man
    // hinh). Khong co gi de lam ngoai viec de nguyen nhu cu.
    request.catch(() => undefined);
  }, [videoRef]);

  const tracks = useMemo(() => subtitles ?? [], [subtitles]);

  // Phim le thi khong co tap nao de chuyen, giau han hai nut cho do roi mat.
  const episodeNav = Boolean(onPrevious || onNext);

  /**
   * Duong phu de dang bat, -1 la tat.
   *
   * <p>Dat gia tri dau ngay trong useState chu khong bat bang thuoc tinh `default`
   * cua the &lt;track&gt;: React khong dong bo lai thuoc tinh do khi doi duong, con
   * `textTracks` thi doi duoc bat cu luc nao.</p>
   */
  const [subtitleIndex, setSubtitleIndex] = useState(() =>
    tracks.findIndex((track) => track.defaultTrack),
  );

  // Bat/tat o muc textTracks - day la cach duy nhat doi duoc duong dang hien.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    for (let index = 0; index < video.textTracks.length; index++) {
      video.textTracks[index].mode = index === subtitleIndex ? "showing" : "disabled";
    }
  }, [subtitleIndex, videoRef, src, tracks.length]);

  /**
   * Hien mot thong bao moi. Phai dat lai co "dang bien mat", neu khong thong bao
   * sau se ke thua trang thai mo dan cua thong bao truoc va hien ra da nhat.
   */
  const showToast = useCallback((next: Toast) => {
    setToastLeaving(false);
    setToast(next);
  }, []);

  // ------------------------------------------------------------ dieu khien phu

  const show = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), HIDE_DELAY_MS);
  }, []);

  const keepVisible = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  /** Nhay thoi gian kem lop bao hieu, giong khi bam hai lan tren YouTube. */
  const nudgeBy = useCallback(
    (seconds: number) => {
      controls.seekBy(seconds);
      setNudge({ id: Date.now(), seconds });
      show();
    },
    [controls, show],
  );

  useEffect(() => {
    if (!nudge) return;
    const timer = window.setTimeout(() => setNudge(null), 700);
    return () => window.clearTimeout(timer);
  }, [nudge]);

  /**
   * Phat / tam dung kem cai chop o giua. Bao hieu bang trang thai sap toi (nguoc voi
   * hien tai) vi {@code controls.toggle} chua kip cap nhat state luc nay.
   */
  const togglePlay = useCallback(() => {
    setFlash({ id: Date.now(), playing: !state.playing });
    controls.toggle();
    show();
  }, [controls, state.playing, show]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  // Ro chuot len thong bao thi giu nguyen: dang dua tay toi nut Hoan tac ma no
  // bien mat la kho chiu nhat.
  useEffect(() => {
    if (!toast || toastHeld) return;

    const life = toast.ms ?? TOAST_MS;
    const fade = window.setTimeout(() => setToastLeaving(true), life);
    const drop = window.setTimeout(() => {
      setToast(null);
      setToastLeaving(false);
    }, life + TOAST_FADE_MS);

    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(drop);
    };
  }, [toast, toastHeld]);

  // Dang phat thi tu an dieu khien sau mot luc. Khi tam dung thi khong can hen gio:
  // `idle` ben duoi da luon la false nen dieu khien van hien.
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setTimeout(() => setVisible(false), HIDE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.playing]);

  // Ap am luong da luu, va nhay toi vi tri xem do dang cua lan truoc.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = savedVolume;
    // Chi chay khi doi tap: startAt cua tap moi khac tap cu.
    if (startAt > 0) {
      video.currentTime = startAt;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Bao vi tri dang xem ra ngoai de tang tren luu lai.
  useEffect(() => {
    if (!onProgress || state.duration <= 0) return;
    onProgress(state.currentTime, state.duration);
  }, [onProgress, state.currentTime, state.duration]);

  // ------------------------------------------------------------ tu sang tap sau

  /**
   * Tap ma nguoi dung da bam huy dem nguoc.
   *
   * <p>Ghi lai chinh duong phat chu khong phai mot co bat/tat: doi tap la gia tri nay
   * tu het hieu luc, khong phai dat lai bang effect.</p>
   */
  const [autoNextOff, setAutoNextOff] = useState<string | null>(null);

  // Chi dem nguoc khi: het tap, con tap ke, dang bat tu chuyen tap, va chua bam Huy.
  const countingDown =
    state.ended && Boolean(onNext) && autoplayNext && autoNextOff !== src;

  /** Phat lai tu dau, dung o man hinh het tap. */
  const replay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => undefined);
  }, [videoRef]);

  // Da doc duoc thoi luong nghia la luong chay duoc; tu day tro di khong duoc
  // nhuong lai cho iframe nua, du sau do co loi tam thoi. Truoc khi do, neu cho
  // qua lau ma van chua co gi thi moi coi la khong phat duoc.
  const started = useRef(false);

  useEffect(() => {
    if (state.duration > 0) {
      started.current = true;
      return;
    }
    if (!onUnplayable || started.current) return;

    const timer = window.setTimeout(onUnplayable, UNPLAYABLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [state.duration, onUnplayable]);

  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFullscreen(active);
      // Thoat toan man hinh la trinh duyet tu bo khoa huong, nhan nut phai theo.
      if (!active) setRotated(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /**
   * Xoay ngang man hinh, chi co nghia tren dien thoai.
   *
   * <p>Khoa huong man hinh chi duoc phep khi dang toan man hinh, nen mot nut nay lam
   * ca hai viec. May ban khong co API nay - va co cung vo nghia - nen an han nut di
   * thay vi de mot nut bam vao khong an.</p>
   */
  const canRotate =
    hydrated &&
    typeof lockableOrientation()?.lock === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  // Ham thuong chu khong memo hoa: no chi duoc dung o mot nut, memo hoa khong duoc gi
  // ma con lam cong cu phan tich phai doan them.
  async function toggleRotate() {
    const shell = shellRef.current;
    const orientation = lockableOrientation();
    if (!shell || !orientation?.lock) return;

    try {
      if (rotated) {
        orientation.unlock();
        if (document.fullscreenElement) await document.exitFullscreen();
        setRotated(false);
        return;
      }

      if (!document.fullscreenElement) await shell.requestFullscreen();
      await orientation.lock("landscape");
      setRotated(true);
    } catch {
      // Trinh duyet tu choi (iOS khong cho khoa huong) - giu nguyen nhu cu.
    }
  }

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      shellRef.current?.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      controls.setVolume(value);
      setSavedVolume(value);
    },
    [controls, setSavedVolume],
  );

  // ------------------------------------------------------------ bo qua gioi thieu

  // Chi moi hien nut khi da co moc that cua bo phim nay. Khong doan mot con so
  // mac dinh: doan sai thi nguoi dung mat luon doan dau tap.
  const canSkipIntro =
    introEnd > 0 &&
    state.duration > 0 &&
    state.currentTime < introEnd - 2 &&
    state.currentTime < INTRO_WINDOW_S;

  const skipIntro = useCallback(() => {
    controls.seekTo(introEnd);
    show();
  }, [controls, introEnd, show]);

  /**
   * Hoc moc gioi thieu tu chinh thao tac cua nguoi dung: mot cu tua nhay ve phia
   * truoc, bat dau o dau tap va van con trong phan dau, gan nhu chac chan la dang
   * bo qua gioi thieu.
   *
   * Chi goi tu cac thao tac tua that cua nguoi dung. Neu doi chieu trong effect thi
   * chinh cu nhay cua tinh nang tu bo qua cung bi tinh la mot lan hoc moi.
   */
  const learnIntro = useCallback(
    (from: number, to: number) => {
      if (!onSetIntro) return;
      const looksLikeIntroSkip =
        to - from >= MIN_SKIP_JUMP_S && from < INTRO_WINDOW_S && to < INTRO_WINDOW_S;
      if (!looksLikeIntroSkip || Math.abs(to - introEnd) < 3) return;

      const previous = introEnd;
      onSetIntro(Math.round(to));
      showToast({
        id: Date.now(),
        text: `Đã ghi nhớ hết giới thiệu ở ${formatTime(to)}`,
        undo: () => onSetIntro(previous > 0 ? previous : null),
      });
    },
    [introEnd, onSetIntro, showToast],
  );

  // Da co moc thi lan phat dau tien cua moi tap se tu nhay qua, kem nut hoan tac.
  const autoSkipped = useRef(false);

  useEffect(() => {
    autoSkipped.current = false;
  }, [src]);

  /**
   * Tu bo qua duoc gan vao su kien "playing" that cua the <video> chu khong vao
   * nut phat: doi tap khi dang xem thi trinh duyet phat tiep tap moi ma khong di
   * qua nut nao ca, dung nao bo qua se khong chay - ma do lai la truong hop chinh
   * cua phim bo. Dat trong effect roi so voi trang thai cung khong duoc: chinh cu
   * nhay cua no lam trang thai doi va effect chay lai.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || introEnd <= 0) return;

    const onPlaying = () => {
      if (autoSkipped.current) return;

      const from = video.currentTime;
      if (from >= introEnd || from > INTRO_WINDOW_S) return;

      autoSkipped.current = true;
      video.currentTime = introEnd;
      showToast({
        id: Date.now(),
        text: `Đã bỏ qua giới thiệu tới ${formatTime(introEnd)}`,
        undo: () => {
          video.currentTime = from;
        },
      });
    };

    video.addEventListener("playing", onPlaying);
    return () => video.removeEventListener("playing", onPlaying);
  }, [src, introEnd, videoRef, showToast]);

  // Danh sach chuong ben ngoai bam vao thi nhay tai day. Chi la thao tac len the
  // <video>, khong dat lai state nao nen khong keo theo vong render.
  useEffect(() => {
    if (!seekRequest) return;
    controls.seekTo(seekRequest.at);
  }, [seekRequest, controls]);

  // ------------------------------------------------------------ ban phim

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Khong cuop phim khi con tro dang o trong o nhap lieu.
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

    const key = event.key.toLowerCase();
    const handled = true;

    switch (key) {
      case " ":
      case "k":
        togglePlay();
        break;
      case "j":
        nudgeBy(-seekStep);
        break;
      case "l":
        nudgeBy(seekStep);
        break;
      case "arrowleft":
        nudgeBy(-5);
        break;
      case "arrowright":
        nudgeBy(5);
        break;
      case "arrowup":
        setVolume(Math.min(state.volume + 0.05, 1));
        show();
        break;
      case "arrowdown":
        setVolume(Math.max(state.volume - 0.05, 0));
        show();
        break;
      case "c":
        if (tracks.length > 0) {
          setSubtitleIndex((current) => (current >= 0 ? -1 : 0));
          show();
        }
        break;
      case "m":
        controls.toggleMute();
        show();
        break;
      case "f":
        toggleFullscreen();
        break;
      case "t":
        onToggleTheater();
        break;
      case "i":
        togglePip();
        break;
      case "n":
        onNext?.();
        break;
      case "p":
        onPrevious?.();
        break;
      case "home":
        controls.seekTo(0);
        break;
      case "end":
        controls.seekTo(state.duration);
        break;
      default:
        if (/^[0-9]$/.test(key) && state.duration > 0) {
          const to = (state.duration * Number(key)) / 10;
          learnIntro(state.currentTime, to);
          controls.seekTo(to);
          show();
        } else {
          return;
        }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // ------------------------------------------------------------ thanh tien do

  const progressRef = useRef<HTMLDivElement>(null);

  // Be ngang giu trong state chu khong doc ref luc render: anh xem truoc phai biet
  // be ngang that de ke lai cho khong tran ra ngoai khung phat.
  const [barWidth, setBarWidth] = useState(0);

  function ratioAt(clientX: number): number {
    const bar = progressRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    setBarWidth(rect.width);
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  }

  const scrubFrom = useRef(0);

  function onScrubStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubFrom.current = state.currentTime;
    const seconds = ratioAt(event.clientX) * state.duration;
    setScrub(seconds);
    controls.seekTo(seconds);
  }

  function onScrubMove(event: ReactPointerEvent<HTMLDivElement>) {
    const seconds = ratioAt(event.clientX) * state.duration;
    setHover(seconds);
    requestPreview(seconds);
    if (scrub !== null) {
      setScrub(seconds);
      controls.seekTo(seconds);
    }
  }

  function onScrubEnd(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (scrub !== null) {
      learnIntro(scrubFrom.current, scrub);
    }
    setScrub(null);
  }

  const [hover, setHover] = useState<number | null>(null);

  const played = state.duration > 0 ? ((scrub ?? state.currentTime) / state.duration) * 100 : 0;
  const hoverPercent = hover !== null && state.duration > 0 ? (hover / state.duration) * 100 : 0;

  // Ke anh xem truoc vao trong hai mep: o dau va cuoi tap thi no dung yen mot cho
  // thay vi tho ra ngoai khung phat.
  const previewEdge = PREVIEW_WIDTH / 2;
  const previewLeft = Math.min(
    Math.max((hoverPercent / 100) * barWidth, previewEdge),
    Math.max(previewEdge, barWidth - previewEdge),
  );

  const introPercent = introEnd > 0 && state.duration > 0 ? (introEnd / state.duration) * 100 : 0;

  // Cat thanh tien do thanh tung doan theo chuong, kieu YouTube. Chuong dau tien
  // khong bat buoc bat dau tu 0 nen phai tu them doan mo dau.
  const segments = useMemo(() => {
    if (state.duration <= 0) return [{ start: 0, end: state.duration, title: null as string | null }];

    const marks = (chapters ?? []).filter((mark) => mark.at > 0 && mark.at < state.duration);
    if (marks.length === 0) {
      return [{ start: 0, end: state.duration, title: null as string | null }];
    }

    const starts = [0, ...marks.map((mark) => mark.at)];
    const titles = [
      (chapters ?? []).find((mark) => mark.at === 0)?.title ?? null,
      ...marks.map((mark) => mark.title),
    ];

    return starts.map((start, index) => ({
      start,
      end: starts[index + 1] ?? state.duration,
      title: titles[index],
    }));
  }, [chapters, state.duration]);

  /** Doan dang o duoi con tro: dung de to dam no tren thanh va hien ten len tren. */
  const hoveredIndex =
    hover === null ? -1 : segments.findIndex((part) => hover >= part.start && hover < part.end);

  const hoveredChapter = hoveredIndex >= 0 ? segments[hoveredIndex].title : null;

  const idle = !visible && state.playing && panel === null;

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      role="region"
      aria-label={`Trình phát: ${title}`}
      onKeyDown={onKeyDown}
      onPointerMove={show}
      onPointerLeave={() => state.playing && setVisible(false)}
      className={`group relative w-full overflow-hidden bg-black outline-none ${
        fullscreen ? "h-screen" : "aspect-video rounded-xl"
      } ${idle ? "cursor-none" : "cursor-default"}`}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="size-full"
      >
        {tracks.map((track) => (
          <track
            key={track.url}
            kind="subtitles"
            src={track.url}
            srcLang={track.lang}
            label={track.label}
          />
        ))}
      </video>

      {/* Dang tai: vong xoay mong kieu YouTube, khong lam toi ca khung */}
      {state.waiting && !state.error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <span className="size-14 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
            <span className="rounded bg-black/40 px-2 py-0.5 text-xs text-white/85 backdrop-blur-sm">
              Đang tải từ nguồn…
            </span>
          </div>
        </div>
      )}

      {/* Nut phat lon o giua khi dang dung */}
      {!state.playing && !state.waiting && !state.error && !flash && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Phát"
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid size-[68px] place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-brand">
            <PlayIcon width={34} height={34} />
          </span>
        </button>
      )}

      {/* Chop tron phat / tam dung o giua, giong YouTube moi */}
      {flash && (
        <div
          key={flash.id}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span className="player-flash grid size-[72px] place-items-center rounded-full bg-black/55 text-white">
            {flash.playing ? (
              <PlayIcon width={34} height={34} />
            ) : (
              <PauseIcon width={34} height={34} />
            )}
          </span>
        </div>
      )}

      {/* Bao hieu tua nhanh: nen mo dan mot nua man + ba mui ten nhap nhay */}
      {nudge && (
        <div
          key={nudge.id}
          className={`pointer-events-none absolute inset-y-0 grid w-2/5 place-items-center ${
            nudge.seconds < 0 ? "left-0" : "right-0"
          }`}
        >
          <span
            aria-hidden="true"
            className={`player-ripple absolute inset-0 bg-white/10 ${
              nudge.seconds < 0
                ? "rounded-r-[100%] [transform:translateX(-30%)]"
                : "rounded-l-[100%] [transform:translateX(30%)]"
            }`}
          />
          <div className="relative flex flex-col items-center gap-1 text-white">
            <div
              className={`player-chevron flex ${nudge.seconds < 0 ? "" : "flex-row-reverse"}`}
            >
              {nudge.seconds < 0 ? (
                <>
                  <ChevronLeftIcon width={22} height={22} />
                  <ChevronLeftIcon width={22} height={22} />
                  <ChevronLeftIcon width={22} height={22} />
                </>
              ) : (
                <>
                  <ChevronRightIcon width={22} height={22} />
                  <ChevronRightIcon width={22} height={22} />
                  <ChevronRightIcon width={22} height={22} />
                </>
              )}
            </div>
            <span className="text-sm font-medium tabular-nums">
              {Math.abs(nudge.seconds)} giây
            </span>
          </div>
        </div>
      )}

      {state.error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center">
          <div>
            <p className="text-sm text-white">{state.error}</p>
            <p className="mt-1 text-xs text-white/60">
              Một số nguồn chặn phát trực tiếp. Hãy thử server hoặc tập khác.
            </p>
          </div>
        </div>
      )}

      {/* Thong bao kem hoan tac */}
      {toast && (
        <div
          key={toast.id}
          onPointerEnter={() => setToastHeld(true)}
          onPointerLeave={() => setToastHeld(false)}
          className={`absolute left-4 overflow-hidden rounded-lg bg-black/85 text-xs text-white shadow-lg backdrop-blur-sm transition-[bottom] duration-200 ${
            idle ? "bottom-6" : "bottom-20"
          } ${toastLeaving ? "player-toast-leaving" : "player-toast"}`}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  showToast({ id: Date.now(), text: "Đã hoàn tác", ms: CONFIRM_MS });
                }}
                className="rounded px-1.5 py-0.5 font-medium text-blue-400 transition hover:bg-white/10 hover:text-blue-300"
              >
                Hoàn tác
              </button>
            )}
          </div>

          {/* Vach dem nguoc, dung lai khi con tro dang giu thong bao */}
          <span
            className="player-toast-bar block h-0.5 bg-white/40"
            style={{
              animationDuration: `${toast.ms ?? TOAST_MS}ms`,
              animationPlayState: toastHeld ? "paused" : "running",
            }}
          />
        </div>
      )}

      {/* Nut bo qua gioi thieu */}
      {canSkipIntro && (
        <button
          type="button"
          onClick={skipIntro}
          className={`absolute right-4 rounded-lg border border-white/70 bg-black/70 px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black ${
            idle ? "bottom-6" : "bottom-20"
          }`}
        >
          Bỏ qua giới thiệu
        </button>
      )}

      {/* Man hinh het tap: dem nguoc sang tap ke (neu bat), hoac cho phat lai / xem tiep */}
      {state.ended && !state.error && !state.waiting && (
        <EndScreen
          key={countingDown ? "countdown" : "ended"}
          hasNext={Boolean(onNext)}
          countdown={countingDown}
          seconds={AUTO_NEXT_SECONDS}
          nextName={nextEpisodeName}
          onNext={onNext}
          onReplay={replay}
          onCancel={() => setAutoNextOff(src)}
        />
      )}

      {/* Lop dieu khien */}
      <div
        onPointerEnter={keepVisible}
        onPointerLeave={() => state.playing && show()}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-2.5 pt-14 transition-opacity duration-200 ${
          idle ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        {/* Thanh tien do */}
        <div
          ref={progressRef}
          role="slider"
          aria-label="Tiến độ phát"
          aria-valuemin={0}
          aria-valuemax={Math.round(state.duration)}
          aria-valuenow={Math.round(state.currentTime)}
          tabIndex={0}
          onPointerDown={onScrubStart}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubEnd}
          onPointerEnter={startPreview}
          onPointerLeave={() => setHover(null)}
          className="group/bar relative flex h-6 cursor-pointer items-center"
        >
          <div className="relative h-[3px] w-full transition-all group-hover/bar:h-[5px]">
            {/* Moi chuong la mot doan rieng, cach nhau mot khe nho */}
            {/*
              Re chuot toi dau thi doan chuong o do noi cao han han cac doan khac, va
              cac khe giua cac doan gian ra - nhin mot cai la thay ranh gioi chuong
              nam o dau, giong thanh tien do cua YouTube.
            */}
            <div className="absolute inset-0 flex items-center gap-[2px] transition-all duration-150 group-hover/bar:gap-[3px]">
              {segments.map((part, index) => {
                const width = ((part.end - part.start) / state.duration) * 100;
                const span = part.end - part.start;
                const cut = (value: number) =>
                  span <= 0 ? 0 : Math.min(Math.max((value - part.start) / span, 0), 1) * 100;
                const active = index === hoveredIndex;

                return (
                  <div
                    key={part.start}
                    className={`relative overflow-hidden rounded-full transition-all duration-150 ${
                      active ? "h-[9px] bg-white/45" : "h-full bg-white/25"
                    }`}
                    style={{ width: `${width}%` }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-white/40"
                      style={{ width: `${cut(state.buffered)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-brand"
                      style={{ width: `${cut((scrub ?? state.currentTime))}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Vach mau danh dau moc het gioi thieu, de do lai cho ma sua */}
            {introPercent > 0 && (
              <span
                aria-hidden="true"
                title="Hết giới thiệu"
                className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-amber-300"
                style={{ left: `${introPercent}%` }}
              />
            )}

            <span
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-brand shadow-[0_0_3px_rgba(0,0,0,0.5)] transition-transform duration-150 group-hover/bar:scale-100"
              style={{ left: `${played}%` }}
            />
          </div>

          {hover !== null && state.duration > 0 && (
            <div
              className="pointer-events-none absolute bottom-full mb-2 flex -translate-x-1/2 flex-col items-center gap-1"
              style={{ left: `${previewLeft}px` }}
            >
              <div
                className="relative overflow-hidden rounded-md border border-white/25 bg-black shadow-xl"
                style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
              >
                <canvas
                  ref={setPreviewCanvas}
                  width={PREVIEW_WIDTH}
                  height={PREVIEW_HEIGHT}
                  className={`block size-full transition-opacity duration-150 ${
                    previewReady ? "opacity-100" : "opacity-0"
                  }`}
                />
                {!previewReady && (
                  <span className="absolute inset-0 grid place-items-center text-[10px] text-white/50">
                    Đang tải xem trước…
                  </span>
                )}
              </div>

              {hoveredChapter && (
                <span className="max-w-[200px] truncate rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {hoveredChapter}
                </span>
              )}

              <span className="rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                {formatTime(hover)}
              </span>
            </div>
          )}
        </div>

        {/* Hang nut */}
        <div className="flex items-center gap-1 text-white">
          {/*
            Phim bo thi luon ve ca hai nut, cai nao khong dung duoc thi lam mo di
            chu khong an: an mot ben se lam ca cum nut xe dich moi lan doi tap.
          */}
          {episodeNav && (
            <ControlButton
              label="Tập trước (p)"
              onClick={onPrevious}
              disabled={!onPrevious}
            >
              <PreviousEpisodeIcon />
            </ControlButton>
          )}

          <ControlButton
            label={`Tua lùi ${seekStep} giây (j)`}
            onClick={() => nudgeBy(-seekStep)}
          >
            <SeekBackIcon seconds={seekStep} />
          </ControlButton>

          <ControlButton
            label={state.playing ? "Tạm dừng (k)" : "Phát (k)"}
            onClick={togglePlay}
          >
            {state.playing ? <PauseIcon /> : <PlayIcon />}
          </ControlButton>

          <ControlButton
            label={`Tua tới ${seekStep} giây (l)`}
            onClick={() => nudgeBy(seekStep)}
          >
            <SeekForwardIcon seconds={seekStep} />
          </ControlButton>

          {episodeNav && (
            <ControlButton label="Tập tiếp theo (n)" onClick={onNext} disabled={!onNext}>
              <NextEpisodeIcon />
            </ControlButton>
          )}

          <VolumeControl
            volume={state.volume}
            muted={state.muted}
            onToggleMute={controls.toggleMute}
            onChange={setVolume}
          />

          <span className="ml-1 select-none text-xs tabular-nums text-white/90">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          {episodeLabel && (
            <span className="ml-2 hidden select-none rounded bg-white/15 px-2 py-0.5 text-xs font-medium text-white sm:inline">
              {episodeLabel}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {tracks.length > 0 && (
              <ControlButton
                label={subtitleIndex >= 0 ? "Tắt phụ đề (c)" : "Bật phụ đề (c)"}
                onClick={() => setSubtitleIndex((current) => (current >= 0 ? -1 : 0))}
              >
                <span className="relative grid place-items-center">
                  <SubtitleIcon />
                  {subtitleIndex >= 0 && (
                    <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-brand" />
                  )}
                </span>
              </ControlButton>
            )}

            <SettingsMenu
              open={panel !== null}
              panel={panel ?? "root"}
              rate={state.rate}
              levels={state.levels}
              level={state.level}
              introEnd={introEnd}
              audio={audio}
              subtitleTracks={tracks}
              subtitleIndex={subtitleIndex}
              onSubtitle={(index) => {
                setSubtitleIndex(index);
                setPanel("root");
              }}
              seekStep={seekStep}
              onSeekStep={(value) => {
                setSeekStep(value);
                setPanel("root");
              }}
              autoplayNext={autoplayNext}
              onToggleAutoplay={() => setAutoplayNext((current) => !current)}
              canEditIntro={Boolean(onSetIntro) && state.duration > 0}
              onSetIntroHere={() => {
                onSetIntro?.(Math.round(state.currentTime));
                setPanel(null);
              }}
              onClearIntro={() => {
                onSetIntro?.(null);
                setPanel(null);
              }}
              onOpen={() => {
                setPanel("root");
                keepVisible();
              }}
              onClose={() => setPanel(null)}
              onPanel={setPanel}
              onRate={(rate) => {
                controls.setRate(rate);
                setPanel("root");
              }}
              onLevel={(level) => {
                controls.setLevel(level);
                setPanel("root");
              }}
            />

            {pipSupported && (
              <ControlButton
                label={pip ? "Thoát ảnh trong ảnh (i)" : "Ảnh trong ảnh (i)"}
                onClick={togglePip}
              >
                <span className={pip ? "text-brand" : undefined}>
                  <PictureInPictureIcon />
                </span>
              </ControlButton>
            )}

            <ControlButton
              label={theater ? "Chế độ mặc định (t)" : "Chế độ rạp (t)"}
              onClick={onToggleTheater}
            >
              {theater ? <DefaultViewIcon /> : <TheaterIcon />}
            </ControlButton>

            {canRotate && (
              <ControlButton
                label={rotated ? "Thoát xoay ngang" : "Xoay ngang màn hình"}
                onClick={toggleRotate}
              >
                <span className={rotated ? "text-brand" : undefined}>
                  <RotateScreenIcon />
                </span>
              </ControlButton>
            )}

            <ControlButton
              label={fullscreen ? "Thoát toàn màn hình (f)" : "Toàn màn hình (f)"}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The dem nguoc hien khi het tap.
 *
 * <p>Tach thanh component rieng de gia tri dau tien dat duoc ngay trong {@code useState}:
 * neu dem trong chinh trinh phat thi phai dat lai bo dem tu trong effect, dieu ma React
 * khuyen khong nen lam. Thoat khoi man hinh nay la component bi go, bo dem tu mat.</p>
 */
/**
 * Man hinh hien khi het tap.
 *
 * <p>Hai che do trong cung mot component (dat gia tri dau ngay trong {@code useState},
 * go khoi man la bo dem tu mat):</p>
 * <ul>
 *   <li><b>Dem nguoc</b> ({@code countdown} = true): con tap ke va dang bat tu chuyen tap.
 *       Hien ten tap ke + vong dem nguoc, het gio thi tu sang tap; kem nut Huy.</li>
 *   <li><b>Thu cong</b>: tat tu chuyen, da bam Huy, hoac la tap cuoi. Cho Phat lai va
 *       (neu con) Xem tap tiep theo.</li>
 * </ul>
 */
function EndScreen({
  hasNext,
  countdown,
  seconds,
  nextName,
  onNext,
  onReplay,
  onCancel,
}: {
  hasNext: boolean;
  countdown: boolean;
  seconds: number;
  nextName?: string | null;
  onNext?: () => void;
  onReplay: () => void;
  onCancel: () => void;
}) {
  // Bo dem dat lai moi lan component gan lai (xem `key` o cho goi): doi giua che do
  // dem nguoc / thu cong la gan lai, nen khong can effect dat lai (tranh set-state-in-effect).
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setInterval(() => setLeft((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  // Dem het thi moi sang tap, lam o day chu khong trong ham cap nhat state:
  // React co the goi ham cap nhat hai lan, sang tap hai lan la nhay mat mot tap.
  useEffect(() => {
    if (!countdown || left > 0) return;
    onNext?.();
  }, [countdown, left, onNext]);

  const ratio = seconds > 0 ? left / seconds : 0;

  return (
    <div className="absolute inset-0 grid place-items-center bg-black/80 px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        {countdown ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-white/60">
              Tập tiếp theo sau {left} giây
            </p>
            {nextName && (
              <p className="line-clamp-2-title text-base font-semibold leading-6 text-white">
                {nextName}
              </p>
            )}

            <button
              type="button"
              onClick={onNext}
              aria-label="Xem tập tiếp theo ngay"
              className="relative grid size-16 place-items-center rounded-full bg-black/60 text-white transition hover:scale-105 hover:bg-brand"
            >
              {/* Vong dem nguoc ve bang conic-gradient, khong can them thu vien nao */}
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(var(--brand, #f00) ${(1 - ratio) * 360}deg, rgba(255,255,255,.25) 0deg)`,
                  mask: "radial-gradient(circle, transparent 60%, #000 61%)",
                  WebkitMask: "radial-gradient(circle, transparent 60%, #000 61%)",
                }}
              />
              <NextEpisodeIcon width={26} height={26} />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
            >
              Huỷ
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-white/80">Đã xem hết tập này</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onReplay}
                className="flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white transition hover:bg-white/25"
              >
                <ReplayIcon width={18} height={18} />
                Phát lại
              </button>
              {hasNext && onNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-brand-fg transition hover:opacity-90"
                >
                  <NextEpisodeIcon width={18} height={18} />
                  Tập tiếp theo
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/15 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onChange,
}: {
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onChange: (value: number) => void;
}) {
  const level = muted || volume === 0 ? 0 : volume;

  return (
    <div className="group/vol flex items-center">
      <ControlButton label={muted ? "Bật tiếng (m)" : "Tắt tiếng (m)"} onClick={onToggleMute}>
        {level === 0 ? (
          <VolumeMutedIcon />
        ) : level < 0.5 ? (
          <VolumeLowIcon />
        ) : (
          <VolumeHighIcon />
        )}
      </ControlButton>

      {/* Thanh am luong truot ra khi ro chuot, giong YouTube. */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Âm lượng"
        className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/vol:mx-2 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:mx-2 focus:w-20 focus:opacity-100 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        style={{
          backgroundImage: `linear-gradient(to right, white ${level * 100}%, rgba(255,255,255,0.3) ${level * 100}%)`,
        }}
      />
    </div>
  );
}

function SettingsMenu({
  open,
  panel,
  rate,
  levels,
  level,
  introEnd,
  audio,
  subtitleTracks,
  subtitleIndex,
  onSubtitle,
  seekStep,
  onSeekStep,
  autoplayNext,
  onToggleAutoplay,
  canEditIntro,
  onSetIntroHere,
  onClearIntro,
  onOpen,
  onClose,
  onPanel,
  onRate,
  onLevel,
}: {
  open: boolean;
  panel: Panel;
  rate: number;
  levels: Array<{ index: number; label: string }>;
  level: number;
  introEnd: number;
  audio: AudioChain;
  subtitleTracks: Subtitle[];
  subtitleIndex: number;
  onSubtitle: (index: number) => void;
  seekStep: number;
  onSeekStep: (seconds: number) => void;
  autoplayNext: boolean;
  onToggleAutoplay: () => void;
  canEditIntro: boolean;
  onSetIntroHere: () => void;
  onClearIntro: () => void;
  onOpen: () => void;
  onClose: () => void;
  onPanel: (panel: Panel) => void;
  onRate: (rate: number) => void;
  onLevel: (level: number) => void;
}) {
  const qualityLabel =
    level === -1 ? "Tự động" : (levels.find((item) => item.index === level)?.label ?? "Tự động");

  return (
    <div className="relative">
      <ControlButton label="Cài đặt" onClick={open ? onClose : onOpen}>
        <SettingsIcon />
      </ControlButton>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onClose}
            className="fixed inset-0 z-10 cursor-default"
          />

          <div
            className={`player-menu absolute bottom-11 right-0 z-20 overflow-hidden rounded-xl bg-[#1c1c1c]/95 py-2 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md ${
              panel === "audio" ? "w-80" : "w-56"
            }`}
          >
            {panel === "root" && (
              <>
                <MenuToggle label="Tự động chuyển tập" on={autoplayNext} onClick={onToggleAutoplay} />
                <MenuRow onClick={() => onPanel("rate")} value={rate === 1 ? "Chuẩn" : `${rate}x`}>
                  Tốc độ phát
                </MenuRow>
                {levels.length > 0 && (
                  <MenuRow onClick={() => onPanel("quality")} value={qualityLabel}>
                    Chất lượng
                  </MenuRow>
                )}
                {subtitleTracks.length > 0 && (
                  <MenuRow
                    onClick={() => onPanel("subtitle")}
                    value={
                      subtitleIndex >= 0
                        ? (subtitleTracks[subtitleIndex]?.label ?? "Đang bật")
                        : "Tắt"
                    }
                  >
                    Phụ đề
                  </MenuRow>
                )}
                <MenuRow
                  onClick={() => onPanel("audio")}
                  value={audio.active ? `${Math.round(audio.boost * 100)}%` : "Chuẩn"}
                >
                  Âm thanh
                </MenuRow>
                <MenuRow onClick={() => onPanel("seek")} value={`${seekStep} giây`}>
                  Bước tua nhanh
                </MenuRow>
                {canEditIntro && (
                  <MenuRow
                    onClick={() => onPanel("intro")}
                    value={introEnd > 0 ? formatTime(introEnd) : "Chưa đặt"}
                  >
                    Mốc hết giới thiệu
                  </MenuRow>
                )}
              </>
            )}

            {panel === "rate" && (
              <>
                <MenuHeader title="Tốc độ phát" onBack={() => onPanel("root")} />
                {RATES.map((value) => (
                  <MenuOption key={value} active={value === rate} onClick={() => onRate(value)}>
                    {value === 1 ? "Chuẩn" : `${value}x`}
                  </MenuOption>
                ))}
              </>
            )}

            {panel === "audio" && <AudioPanel audio={audio} onBack={() => onPanel("root")} />}

            {panel === "subtitle" && (
              <>
                <MenuHeader title="Phụ đề" onBack={() => onPanel("root")} />
                <MenuOption active={subtitleIndex < 0} onClick={() => onSubtitle(-1)}>
                  Tắt
                </MenuOption>
                {subtitleTracks.map((track, index) => (
                  <MenuOption
                    key={track.url}
                    active={index === subtitleIndex}
                    onClick={() => onSubtitle(index)}
                  >
                    {track.label}
                  </MenuOption>
                ))}
              </>
            )}

            {panel === "seek" && (
              <>
                <MenuHeader title="Bước tua nhanh" onBack={() => onPanel("root")} />
                <p className="px-4 pb-2 text-xs text-white/60">
                  Áp dụng cho hai nút tua và phím J / L.
                </p>
                {SEEK_STEPS.map((value) => (
                  <MenuOption
                    key={value}
                    active={value === seekStep}
                    onClick={() => onSeekStep(value)}
                  >
                    {value} giây
                  </MenuOption>
                ))}
              </>
            )}

            {panel === "intro" && (
              <>
                <MenuHeader title="Mốc hết giới thiệu" onBack={() => onPanel("root")} />
                <p className="px-4 pb-2 text-xs text-white/60">
                  Áp dụng cho mọi tập của phim này. Tua qua phần giới thiệu một lần
                  là RapPhim tự ghi nhớ.
                </p>
                <MenuOption active={false} onClick={onSetIntroHere}>
                  Đặt tại vị trí đang xem
                </MenuOption>
                {introEnd > 0 && (
                  <MenuOption active={false} onClick={onClearIntro}>
                    Xoá mốc
                  </MenuOption>
                )}
              </>
            )}

            {panel === "quality" && (
              <>
                <MenuHeader title="Chất lượng" onBack={() => onPanel("root")} />
                <MenuOption active={level === -1} onClick={() => onLevel(-1)}>
                  Tự động
                </MenuOption>
                {levels.map((item) => (
                  <MenuOption
                    key={item.index}
                    active={item.index === level}
                    onClick={() => onLevel(item.index)}
                  >
                    {item.label}
                  </MenuOption>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Bang chinh am thanh: khuech dai va can bang tan so.
 *
 * <p>Cac thanh truot deu la {@code <input type="range">} that chu khong ve tay: ban
 * phim va trinh doc man hinh dung duoc ngay, khong phai tu lam lai tu dau.</p>
 */
function AudioPanel({ audio, onBack }: { audio: AudioChain; onBack: () => void }) {
  return (
    <>
      <MenuHeader title="Âm thanh" onBack={onBack} />

      {!audio.supported ? (
        <p className="px-4 py-3 text-xs text-white/60">
          Nguồn phim này nằm khác tên miền và không cho phép xử lý âm thanh, nên tăng
          tiếng và cân bằng tần số không dùng được ở đây.
        </p>
      ) : (
        <div className="px-4 pb-3 pt-1">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-medium">Tăng tiếng</span>
            <span className="text-xs tabular-nums text-white/60">
              {Math.round(audio.boost * 100)}%
            </span>
          </div>

          <input
            type="range"
            min={100}
            max={MAX_BOOST * 100}
            step={10}
            value={Math.round(audio.boost * 100)}
            onChange={(event) => audio.setBoost(Number(event.target.value) / 100)}
            aria-label="Mức tăng tiếng"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />

          <p className="mt-1.5 text-[11px] leading-4 text-white/50">
            Vượt quá 100% là khuếch đại thêm. Đã có bộ chặn đỉnh nên không vỡ tiếng,
            nhưng để to quá thì vẫn hại tai và loa.
          </p>

          <div className="mb-2 mt-4 font-medium">Cân bằng tần số</div>

          {/*
            Thanh doc xep ngang, nhin mot cai la thay duong cong dang dat.

            Thanh duoc xoay 90 do, ma phep xoay chi doi phan nhin thay chu khong doi o
            ma no chiem: de nguyen trong dong thi sau dai an het be ngang bang va dai
            cuoi bi cat mat. Nen dat tuyet doi trong mot o co be rong co dinh, luc do
            chinh o do quyet dinh cho ngoi.
          */}
          <div className="flex items-end justify-between gap-1">
            {EQ_BANDS.map((frequency, index) => (
              <label key={frequency} className="flex flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-white/50">
                  {audio.bands[index] > 0 ? `+${audio.bands[index]}` : audio.bands[index]}
                </span>

                <span className="relative block h-24 w-8">
                  <input
                    type="range"
                    min={-EQ_RANGE_DB}
                    max={EQ_RANGE_DB}
                    step={1}
                    value={audio.bands[index] ?? 0}
                    onChange={(event) => audio.setBand(index, Number(event.target.value))}
                    aria-label={`Dải ${frequency < 1000 ? `${frequency}Hz` : `${frequency / 1000}kHz`}`}
                    className="absolute left-1/2 top-1/2 h-1 w-24 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer appearance-none rounded-full bg-white/25 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand"
                  />
                </span>

                <span className="text-[10px] text-white/50">
                  {frequency < 1000 ? frequency : `${frequency / 1000}k`}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {AUDIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => audio.applyPreset(preset)}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs transition hover:bg-white/20"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Hang bat/tat trong menu, cong tac kieu iOS - khong mo bang con nhu MenuRow. */
function MenuToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/10"
    >
      <span className="flex-1">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? "bg-brand" : "bg-white/25"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function MenuRow({
  onClick,
  value,
  children,
}: {
  onClick: () => void;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/10"
    >
      <span className="flex-1">{children}</span>
      <span className="text-white/60">{value}</span>
      <ChevronRightIcon width={16} height={16} />
    </button>
  );
}

function MenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-1 flex w-full items-center gap-2 border-b border-white/15 px-3 pb-2 text-left transition hover:bg-white/10"
    >
      <ChevronLeftIcon width={18} height={18} />
      <span className="font-medium">{title}</span>
    </button>
  );
}

function MenuOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/10 ${
        active ? "font-medium" : ""
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-brand" : "bg-transparent"}`} />
      {children}
    </button>
  );
}

/** 65 giay thanh "1:05", 3725 giay thanh "1:02:05". */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  return hours > 0 ? `${hours}:${mm}:${String(secs).padStart(2, "0")}` : `${mm}:${String(secs).padStart(2, "0")}`;
}
