"""Trich phu de CHAY (hardsub) tu video thanh cac cue (chu + moc gio).

Cach lam:
1. Dung ffmpeg lay mau khung hinh o vung phu de (dai duoi man) theo ``fps`` cho truoc.
2. OCR tung khung bang RapidOCR (model PaddleOCR dong goi ONNX, chay CPU, manh tieng Trung).
3. Gop cac khung lien tiep co chu giong nhau thanh mot cue, suy ra start/end tu moc khung.
4. Loc nhieu: bo cue qua ngan, gop cue ke nhau cach nhau khe nho.

Tra ve danh sach ``{"start", "end", "text"}`` (chu o NGON NGU GOC cua phu de; buoc dich
sang tieng Viet la lat cat sau).
"""
from __future__ import annotations

import difflib
import glob
import os
import re
import shutil
import subprocess
import tempfile
from typing import Callable, Optional

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR

        _engine = RapidOCR()
    return _engine


def _extract_frames(src: str, out_dir: str, fps: float, region_top: float,
                    region_height: float, start: float, duration: Optional[float]) -> list[str]:
    # crop=w:h:x:y - lay dai chu cao ih*region_height, bat dau tu ih*region_top (tinh tu tren).
    vf = f"fps={fps},crop=iw:ih*{region_height}:0:ih*{region_top}"
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    if start > 0:
        cmd += ["-ss", str(start)]
    if duration:
        cmd += ["-t", str(duration)]
    cmd += ["-i", src, "-vf", vf, "-q:v", "3", os.path.join(out_dir, "f_%06d.jpg")]
    subprocess.run(cmd, check=True)
    return sorted(glob.glob(os.path.join(out_dir, "f_*.jpg")))


def _ocr_frame(path: str, min_score: float) -> str:
    result, _ = _get_engine()(path)
    if not result:
        return ""
    # RapidOCR tra ve moi dong dang [box, text, score]; score la CHUOI nen phai ep sang so.
    lines = [text.strip() for _box, text, score in result if _score(score) >= min_score and text.strip()]
    return _normalize(" ".join(lines))


def _score(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _similar(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


def extract_cues(
    src: str,
    fps: float = 2.0,
    region_top: float = 0.72,
    region_height: float = 0.28,
    start: float = 0.0,
    duration: Optional[float] = None,
    min_score: float = 0.6,
    min_dur: float = 0.35,
    merge_ratio: float = 0.7,
    progress: Optional[Callable[[int, int], None]] = None,
) -> list[dict]:
    interval = 1.0 / fps
    tmp = tempfile.mkdtemp(prefix="rapphim_ocr_")
    cues: list[dict] = []
    try:
        frames = _extract_frames(src, tmp, fps, region_top, region_height, start, duration)
        total = len(frames)
        current: Optional[dict] = None
        for i, frame in enumerate(frames):
            moment = start + i * interval
            text = _ocr_frame(frame, min_score)
            if text:
                if current and _similar(current["text"], text) >= merge_ratio:
                    current["end"] = moment + interval
                    # Giu ban OCR dai hon (thuong day du hon).
                    if len(text) > len(current["text"]):
                        current["text"] = text
                else:
                    if current:
                        cues.append(current)
                    current = {"start": round(moment, 2), "end": round(moment + interval, 2), "text": text}
            else:
                if current:
                    cues.append(current)
                    current = None
            if progress:
                progress(i + 1, total)
        if current:
            cues.append(current)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    cues = [c for c in cues if c["end"] - c["start"] >= min_dur]
    return _merge_adjacent(cues, merge_ratio)


def _merge_adjacent(cues: list[dict], merge_ratio: float, max_gap: float = 0.8) -> list[dict]:
    """Gop hai cue ke nhau neu chu giong va khe giua chung nho (OCR chop nhay giua chung)."""
    merged: list[dict] = []
    for cue in cues:
        prev = merged[-1] if merged else None
        if prev and _similar(prev["text"], cue["text"]) >= merge_ratio and cue["start"] - prev["end"] <= max_gap:
            prev["end"] = cue["end"]
            if len(cue["text"]) > len(prev["text"]):
                prev["text"] = cue["text"]
        else:
            merged.append(dict(cue))
    return merged
