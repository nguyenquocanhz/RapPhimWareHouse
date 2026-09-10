"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { SaveButton } from "@/components/library/SaveButton";
import { DatabaseIcon, PlayIcon } from "@/components/ui/icons";
import { nfoUrl, subtitleUrl } from "@/lib/api";
import { ratingLabel, statusLabel, typeLabel } from "@/lib/format";
import {
  useChapters,
  useIntroSkips,
  usePlaybackPositions,
  useWatchHistory,
} from "@/lib/library";
import type { Chapter } from "@/lib/library";
import { ChapterList } from "@/components/watch/ChapterList";
import { useChapterThumbs } from "@/components/watch/useChapterThumbs";
import { useSceneSplit } from "@/components/watch/useSceneSplit";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import type { MovieDetail, Subtitle } from "@/lib/types";

interface WatchClientProps {
  movie: MovieDetail;
  /** Khoi mo ta duoc render san o phia server. */
  children: ReactNode;
  /** Danh sach phim lien quan, render san o phia server, dat duoi danh sach tap. */
  related?: ReactNode;
}

interface Position {
  server: number;
  episode: number;
}

const START: Position = { server: 0, episode: 0 };

/**
 * Man hinh xem phim: khung phat 16:9 ben trai, danh sach tap ben phai -
 * cung bo cuc voi trang xem video cua YouTube.
 *
 * Tap dang xem duoc ghi vao lich su ngay khi mo phim va moi lan doi tap,
 * nho vay lan sau quay lai se phat tiep dung cho.
 */
export function WatchClient({ movie, children, related }: WatchClientProps) {
  // Memo hoa de tham chieu on dinh, neu khong mang phu thuoc cua useEffect ben duoi
  // se doi moi lan render va ghi lich su lien tuc.
  const servers = useMemo(
    () => movie.servers.filter((server) => server.episodes.length > 0),
    [movie.servers],
  );

  const { entryFor, record } = useWatchHistory();
  const saved = entryFor(movie.slug, movie.provider);

  // Lua chon trong phien nay duoc uu tien hon vi tri da luu.
  const [picked, setPicked] = useState<Position | null>(null);
  const wanted =
    picked ?? (saved ? { server: saved.serverIndex, episode: saved.episodeIndex } : START);

  // Nguon co the da doi so tap ke tu lan xem truoc nen phai kep lai cho hop le.
  const serverIndex = servers[wanted.server] ? wanted.server : 0;
  const episodeIndex = servers[serverIndex]?.episodes[wanted.episode] ? wanted.episode : 0;

  const currentServer = servers[serverIndex];
  const currentEpisode = currentServer?.episodes[episodeIndex];

  // Doi sang duong cung goc mot lan o day, de VideoPlayer khong phai biet gi ve
  // cach backend dat duong dan.
  const episodeSubtitles = useMemo(
    () =>
      (currentEpisode?.subtitles ?? []).map((track) => ({
        ...track,
        url: subtitleUrl(track.url),
      })),
    [currentEpisode],
  );

  const [theater, setTheater] = useState(false);
  const { positionOf, remember } = usePlaybackPositions();
  const { introOf, rememberIntro, forgetIntro } = useIntroSkips();

  const movieKey = `${movie.provider}:${movie.slug}`;
  const onSetIntro = useCallback(
    (seconds: number | null) => {
      if (seconds === null) {
        forgetIntro(movieKey);
      } else {
        rememberIntro(movieKey, seconds);
      }
    },
    [movieKey, rememberIntro, forgetIntro],
  );

  const positionKey = `${movie.provider}:${movie.slug}:${serverIndex}:${episodeIndex}`;

  // Chuong gan voi noi dung tung tap nen dung chung khoa voi vi tri xem, khong
  // dung khoa cua ca bo phim nhu moc gioi thieu.
  const { chaptersOf, addChapter, setChapters, renameChapter, removeChapter, clearChapters } =
    useChapters();
  const chapters = chaptersOf(positionKey);

  // Vi tri hien tai giu trong ref chu khong phai state: no doi vai lan moi giay,
  // dua vao state se lam ca trang render lai lien tuc.
  const position = useRef(0);
  const getCurrentTime = useCallback(() => position.current, []);

  // Thoi luong thi nguoc lai - chi doi mot lan moi tap nen giu trong state duoc.
  const [duration, setDuration] = useState(0);

  // Ghi vi tri toi da 5 giay mot lan, tranh ghi localStorage lien tuc theo timeupdate.
  const lastSaved = useRef(0);
  const onProgress = useCallback(
    (seconds: number, total: number) => {
      position.current = seconds;
      setDuration(total);

      if (Math.abs(seconds - lastSaved.current) < 5) return;
      lastSaved.current = seconds;
      remember(positionKey, seconds, total);
    },
    [positionKey, remember],
  );

  // Bam mot chuong o danh sach thi gui yeu cau nhay xuong khung phat. Dung kem `id`
  // de bam lai dung chuong do van tinh la mot yeu cau moi.
  const [seekRequest, setSeekRequest] = useState<{ at: number; id: number } | null>(null);
  const onSeekChapter = useCallback((at: number) => {
    setSeekRequest({ at, id: Date.now() });
  }, []);

  const onAddChapter = useCallback(
    (at: number, title: string) => addChapter(positionKey, at, title),
    [addChapter, positionKey],
  );
  const onRenameChapter = useCallback(
    (at: number, title: string) => renameChapter(positionKey, at, title),
    [renameChapter, positionKey],
  );
  const onRemoveChapter = useCallback(
    (at: number) => removeChapter(positionKey, at),
    [removeChapter, positionKey],
  );
  const onClearChapters = useCallback(
    () => clearChapters(positionKey),
    [clearChapters, positionKey],
  );

  // Ket qua quet canh do vao cung cho voi chuong tu dat, chi khac cai ten mac dinh.
  const onDetected = useCallback(
    (cuts: number[]) => {
      setChapters(
        positionKey,
        cuts.map((at, index) => ({ at, title: `Cảnh ${index + 1}` })),
      );
    },
    [setChapters, positionKey],
  );

  const split = useSceneSplit(currentEpisode?.linkM3u8 ?? null, onDetected);

  // Anh khung hinh cho tung moc, de nhin ma dat ten. Danh sach giay duoc memo hoa
  // vi hook ben trong dua vao no de biet con thieu anh nao.
  const chapterTimes = useMemo(() => chapters.map((chapter) => chapter.at), [chapters]);
  const thumbs = useChapterThumbs(currentEpisode?.linkM3u8 ?? null, chapterTimes);

  // "Tap 5/24" - dat ca trong khung phat lan canh tieu de, de khong phai keo xuong
  // danh sach tap moi biet dang xem toi dau.
  const episodeCount = currentServer?.episodes.length ?? 0;
  const episodeLabel = episodeCount > 1 ? `Tập ${episodeIndex + 1}/${episodeCount}` : null;

  const hasNext = currentServer ? episodeIndex < currentServer.episodes.length - 1 : false;
  const goNext = useCallback(() => {
    if (!hasNext) return;
    setPicked({ server: serverIndex, episode: episodeIndex + 1 });
  }, [hasNext, serverIndex, episodeIndex]);

  const hasPrevious = episodeCount > 1 && episodeIndex > 0;
  const goPrevious = useCallback(() => {
    if (episodeIndex <= 0) return;
    setPicked({ server: serverIndex, episode: episodeIndex - 1 });
  }, [serverIndex, episodeIndex]);

  // Ghi lich su khi mo phim va moi lan doi tap. `record` co tham chieu on dinh
  // nen effect nay khong tu kich hoat lai sau khi ghi.
  useEffect(() => {
    if (!currentEpisode) return;
    record(movie, {
      serverIndex,
      episodeIndex,
      serverName: currentServer?.serverName ?? null,
      episodeName: currentEpisode.name,
    });
  }, [movie, record, serverIndex, episodeIndex, currentServer, currentEpisode]);

  const chips = useMemo(
    () =>
      [
        ratingLabel("TMDB", movie.tmdb),
        ratingLabel("IMDb", movie.imdb),
        typeLabel(movie.type),
        statusLabel(movie.status),
        movie.quality,
        movie.lang,
        movie.time,
        movie.year ? `Năm ${movie.year}` : null,
        movie.episodeTotal ? `${movie.episodeTotal} tập` : null,
      ].filter((value): value is string => Boolean(value)),
    [movie],
  );

  const player = (
    <Stage
      movie={movie}
      episodeName={currentEpisode?.name ?? null}
      m3u8={currentEpisode?.linkM3u8 ?? null}
      direct={currentEpisode?.linkDirect ?? null}
      subtitles={episodeSubtitles}
      embed={currentEpisode?.linkEmbed ?? null}
      startAt={positionOf(positionKey)}
      poster={movie.thumbUrl ?? movie.posterUrl}
      introEnd={introOf(movieKey)}
      onSetIntro={onSetIntro}
      onProgress={onProgress}
      theater={theater}
      onToggleTheater={() => setTheater((current) => !current)}
      onNext={hasNext ? goNext : undefined}
      onPrevious={hasPrevious ? goPrevious : undefined}
      episodeLabel={episodeLabel}
      chapters={chapters}
      seekRequest={seekRequest}
    />
  );

  const chapterList = (
    <ChapterList
      chapters={chapters}
      thumbs={thumbs}
      getCurrentTime={getCurrentTime}
      duration={duration}
      onAdd={onAddChapter}
      onRename={onRenameChapter}
      onRemove={onRemoveChapter}
      onSeek={onSeekChapter}
      onClearAll={onClearChapters}
      split={split}
    />
  );

  return (
    <div>
      {/* Che do rap: khung phat trai rong het be ngang, phan con lai xuong duoi. */}
      {theater && <div className="bg-black">{player}</div>}

      <div className="px-4 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_402px]">
          <div className="min-w-0">
            {!theater && player}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-lg font-semibold leading-6 text-fg sm:text-xl">
              {movie.name}
              {currentEpisode?.name ? ` - ${currentEpisode.name}` : ""}
            </h1>

            {episodeLabel && (
              <span className="rounded-lg bg-chip px-2.5 py-1 text-xs font-medium text-fg">
                {episodeLabel}
              </span>
            )}
          </div>

          {movie.originName && (
            <p className="mt-1 text-sm text-muted">{movie.originName}</p>
          )}

          {/* Hang thao tac */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SaveButton movie={movie} variant="pill" />
            {movie.trailerUrl && (
              <a
                href={movie.trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
              >
                <PlayIcon width={18} height={18} />
                Trailer
              </a>
            )}

            {/* File NFO de nap phim vao Kodi / Jellyfin / Emby. */}
            <a
              href={nfoUrl(movie.slug, movie.provider)}
              title="Tải file NFO cho Kodi / Jellyfin / Emby"
              className="flex h-9 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-fg transition hover:bg-chip-hover"
            >
              <DatabaseIcon width={18} height={18} />
              Tải NFO
            </a>
          </div>

          {/* Dai thong tin nhanh */}
          <ul className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-lg bg-chip px-3 py-1.5 text-xs font-medium text-fg"
              >
                {chip}
              </li>
            ))}
          </ul>

          {/* The loai / quoc gia bam duoc */}
          {(movie.categories.length > 0 || movie.countries.length > 0) && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {movie.categories.map((category) => (
                <li key={`c-${category.slug}`}>
                  <Link
                    href={`/the-loai/${category.slug}`}
                    className="inline-block rounded-lg bg-chip px-3 py-1.5 text-xs text-fg transition hover:bg-chip-hover"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {movie.countries.map((country) => (
                <li key={`n-${country.slug}`}>
                  <Link
                    href={`/quoc-gia/${country.slug}`}
                    className="inline-block rounded-lg bg-chip px-3 py-1.5 text-xs text-fg transition hover:bg-chip-hover"
                  >
                    {country.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {chapterList}

          {children}
        </div>

        {/* Cot phai: danh sach tap va phim lien quan */}
        <aside className="min-w-0">
          {servers.length === 0 ? (
            <div className="rounded-xl bg-surface px-4 py-6 text-sm text-muted">
              Nguồn hiện chưa có tập phim nào.
            </div>
          ) : (
            <div className="rounded-xl border border-border">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium text-fg">
                  Danh sách tập
                  <span className="ml-2 font-normal text-muted">
                    {currentServer?.episodes.length ?? 0} tập
                  </span>
                </h2>
              </div>

              {servers.length > 1 && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
                  {servers.map((server, index) => (
                    <button
                      key={server.serverName}
                      type="button"
                      onClick={() => setPicked({ server: index, episode: 0 })}
                      className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
                        index === serverIndex
                          ? "bg-chip-active font-medium text-chip-active-fg"
                          : "bg-chip text-fg hover:bg-chip-hover"
                      }`}
                    >
                      {server.serverName}
                    </button>
                  ))}
                </div>
              )}

              <ul className="grid max-h-[560px] grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-4 xl:grid-cols-3">
                {currentServer?.episodes.map((episode, index) => {
                  const active = index === episodeIndex;
                  return (
                    <li key={`${episode.slug}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setPicked({ server: serverIndex, episode: index })}
                        aria-current={active ? "true" : undefined}
                        className={`flex h-9 w-full items-center justify-center gap-1 rounded-lg px-2 text-xs transition ${
                          active
                            ? "bg-brand font-medium text-brand-fg"
                            : "bg-chip text-fg hover:bg-chip-hover"
                        }`}
                      >
                        {active && <PlayIcon width={14} height={14} />}
                        <span className="truncate">{episode.name ?? index + 1}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

            {related}
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Chon cach phat cho tap hien tai.
 *
 * KKPhim tra ve ca link HLS nen dung duoc trinh phat tu build voi day du dieu khien.
 * NguonC chi co link nhung, luc do danh giu iframe cua nguon - khong dep bang
 * nhung it ra van xem duoc.
 */
function Stage({
  movie,
  episodeName,
  m3u8,
  direct,
  subtitles,
  embed,
  startAt,
  poster,
  introEnd,
  onSetIntro,
  onProgress,
  theater,
  onToggleTheater,
  onNext,
  onPrevious,
  episodeLabel,
  chapters,
  seekRequest,
}: {
  movie: MovieDetail;
  episodeName: string | null;
  m3u8: string | null;
  direct: string | null;
  subtitles: Subtitle[];
  embed: string | null;
  startAt: number;
  poster: string | null;
  introEnd: number;
  onSetIntro: (seconds: number | null) => void;
  onProgress: (seconds: number, duration: number) => void;
  theater: boolean;
  onToggleTheater: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  episodeLabel: string | null;
  chapters: Chapter[];
  seekRequest: { at: number; id: number } | null;
}) {
  const title = `${movie.name}${episodeName ? ` - ${episodeName}` : ""}`;

  // Trinh phat tu build (<video> + hls.js) la mac dinh vi co day du dieu khien.
  // Van giu duong lui sang iframe cua nguon: mot so tap co the bi chan hoac sai
  // dinh dang, luc do trinh phat cua nguon van xem duoc.
  const [ownPlayer, setOwnPlayer] = useState(true);

  const useSourcePlayer = useCallback(() => setOwnPlayer(false), []);

  const switcher = m3u8 && embed && (
    <button
      type="button"
      onClick={() => setOwnPlayer((current) => !current)}
      className="mt-2 rounded-full bg-chip px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-chip-hover"
    >
      {ownPlayer ? "Không xem được? Dùng trình phát của nguồn" : "Quay lại trình phát RapPhim"}
    </button>
  );

  // Kho rieng khong dong goi HLS ma de nguyen file, nen nguon phat co hai dang.
  const stream = m3u8 ?? direct;
  const sourceKind = m3u8 ? "hls" : "file";

  if (stream && (ownPlayer || !embed)) {
    return (
      <div className={theater ? "mx-auto w-full max-w-[1600px]" : ""}>
        <VideoPlayer
          key={stream}
          src={stream}
          sourceKind={sourceKind}
          subtitles={subtitles}
          title={title}
          startAt={startAt}
          onProgress={onProgress}
          theater={theater}
          onToggleTheater={onToggleTheater}
          onNext={onNext}
          onPrevious={onPrevious}
          episodeLabel={episodeLabel}
          onUnplayable={embed ? useSourcePlayer : undefined}
          poster={poster}
          introEnd={introEnd}
          onSetIntro={onSetIntro}
          chapters={chapters}
          seekRequest={seekRequest}
        />
        {switcher}
      </div>
    );
  }

  if (embed) {
    return (
      <div className={theater ? "mx-auto w-full max-w-[1600px]" : ""}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            key={embed}
            src={embed}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="origin"
            className="size-full border-0"
          />
          <button
            type="button"
            onClick={onToggleTheater}
            className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black/90"
          >
            {theater ? "Chế độ mặc định" : "Chế độ rạp"}
          </button>
        </div>
        {/*
          Nhieu nguon chi-embed (nhu NguonC) dat X-Frame-Options: SAMEORIGIN nen trinh
          duyet TU CHOI hien iframe cua ho tren trang minh - khung phat den thui. Khong
          ep nhung duoc, nen cho duong mo thang o tab moi de van xem duoc.
        */}
        <p className="mt-2 text-center text-xs text-muted">
          Không xem được?{" "}
          <a href={embed} target="_blank" rel="noreferrer" className="text-fg underline">
            Mở trình phát của nguồn ở tab mới
          </a>{" "}
          — một số nguồn (như NguonC) chặn phát nhúng trực tiếp.
        </p>
        {switcher}
      </div>
    );
  }

  return (
    <div className="grid aspect-video w-full place-items-center rounded-xl bg-black px-6 text-center text-sm text-muted">
      Phim này chưa có tập nào để phát. Bạn có thể thử đổi sang nguồn dữ liệu khác.
    </div>
  );
}
