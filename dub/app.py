"""RapPhim Dub Service — sinh giong thuyet minh tieng Viet tu danh sach phu de.

Day la microservice rieng (Python) vi OCR/dich/TTS la ML nang, khong nhet vao backend
Java. Phase hien tai: nhan cac cue phu de (co san moc thoi gian + chu), sinh audio TTS
cho tung cue, tra ve manifest de trinh phat ben client phat dong bo va ha tieng goc.

Buoc OCR (phim -> cue) va dich (zh/en -> vi) la cac lat cat tiep theo, se them endpoint
``POST /api/dub/from-video`` dan truoc buoc TTS nay.
"""
from __future__ import annotations

import asyncio
import os
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from tts import DEFAULT_PIPER_VOICE, EDGE_VOICES, synthesize

MEDIA_DIR = Path(os.environ.get("DUB_MEDIA_DIR", "/data/dub"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="RapPhim Dub Service", version="0.1.0")

# Job trong bo nho, du cho quy mo homelab. Mat khi restart - dub la thu tao lai duoc.
JOBS: dict[str, dict] = {}


class CueIn(BaseModel):
    start: float
    end: float
    text: str


class DubRequest(BaseModel):
    cues: list[CueIn]
    engine: str = "edge"  # edge | piper
    voice: str | None = None


class OcrRequest(BaseModel):
    url: str
    fps: float = 2.0
    region_top: float = 0.72
    region_height: float = 0.28
    start: float = 0.0
    duration: float | None = None
    min_score: float = 0.6


class TranslateRequest(BaseModel):
    cues: list[CueIn]
    target: str = "vi"
    source: str = "auto"
    engine: str = "google"  # google | argos


class FromVideoRequest(BaseModel):
    url: str
    # OCR
    fps: float = 2.0
    region_top: float = 0.72
    region_height: float = 0.28
    start: float = 0.0
    duration: float | None = None
    min_score: float = 0.6
    # Dich
    translate: bool = True
    target: str = "vi"
    source: str = "auto"
    translate_engine: str = "google"
    # TTS
    engine: str = "edge"  # edge | piper
    voice: str | None = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "rapphim-dub"}


@app.get("/api/voices")
def voices() -> dict:
    return {"edge": EDGE_VOICES, "piper": [DEFAULT_PIPER_VOICE]}


@app.post("/api/dub")
async def create_dub(req: DubRequest) -> dict:
    if not req.cues:
        raise HTTPException(status_code=400, detail="Thieu danh sach cue.")

    jid = uuid.uuid4().hex[:12]
    JOBS[jid] = {
        "id": jid,
        "status": "pending",
        "engine": req.engine,
        "total": len(req.cues),
        "done": 0,
        "error": None,
        "cues": [c.model_dump() for c in req.cues],
        "created": time.time(),
    }
    asyncio.create_task(_run(jid, req))
    return {"jobId": jid, "status": "pending"}


@app.get("/api/dub/{jid}")
def get_dub(jid: str) -> dict:
    job = JOBS.get(jid)
    if not job:
        raise HTTPException(status_code=404, detail="Khong thay job.")
    return job


@app.get("/api/dub/{jid}/media/{name}")
def get_media(jid: str, name: str) -> FileResponse:
    # Chan di ngang thu muc: chi lay tep ngay trong thu muc cua job.
    path = (MEDIA_DIR / jid / name).resolve()
    if MEDIA_DIR.resolve() not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Khong thay tep.")
    return FileResponse(path)


async def _run(jid: str, req: DubRequest) -> None:
    job = JOBS[jid]
    job["status"] = "running"
    out_dir = MEDIA_DIR / jid
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = "mp3" if req.engine == "edge" else "wav"

    try:
        for index, cue in enumerate(job["cues"]):
            text = (cue.get("text") or "").strip()
            if not text:
                job["done"] += 1
                continue
            name = f"{index:04d}.{ext}"
            await synthesize(text, str(out_dir / name), engine=req.engine, voice=req.voice)
            cue["audio"] = f"/api/dub/{jid}/media/{name}"
            job["done"] += 1
        job["status"] = "done"
    except Exception as exc:  # noqa: BLE001 - go het loi vao job de client doc duoc
        job["status"] = "error"
        job["error"] = str(exc)


# ----------------------------------------------------------------- OCR hardsub -> cue

@app.post("/api/ocr")
async def create_ocr(req: OcrRequest) -> dict:
    jid = uuid.uuid4().hex[:12]
    JOBS[jid] = {
        "id": jid,
        "kind": "ocr",
        "status": "pending",
        "done": 0,
        "total": 0,
        "error": None,
        "cues": [],
        "created": time.time(),
    }
    asyncio.create_task(_run_ocr(jid, req))
    return {"jobId": jid, "status": "pending"}


@app.get("/api/ocr/{jid}")
def get_ocr(jid: str) -> dict:
    job = JOBS.get(jid)
    if not job:
        raise HTTPException(status_code=404, detail="Khong thay job.")
    return job


@app.post("/api/translate")
async def translate_cues_ep(req: TranslateRequest) -> dict:
    import translate as translate_mod

    cues = [c.model_dump() for c in req.cues]
    loop = asyncio.get_running_loop()
    try:
        # Dich chan (goi mang / model) nen chay trong executor de khong treo event loop.
        result = await loop.run_in_executor(
            None,
            lambda: translate_mod.translate_cues(cues, req.target, req.source, req.engine),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Dich that bai: {exc}")
    return {"cues": result}


# ----------------------------------------------------- OCR -> dich -> TTS (mot job)

@app.post("/api/dub/from-video")
async def create_from_video(req: FromVideoRequest) -> dict:
    jid = uuid.uuid4().hex[:12]
    JOBS[jid] = {
        "id": jid,
        "kind": "from-video",
        "status": "pending",
        "phase": "pending",  # ocr | translate | tts | done
        "done": 0,
        "total": 0,
        "error": None,
        "engine": req.engine,
        "cues": [],
        "created": time.time(),
    }
    asyncio.create_task(_run_from_video(jid, req))
    return {"jobId": jid, "status": "pending"}


async def _run_from_video(jid: str, req: FromVideoRequest) -> None:
    import ocr
    import translate as translate_mod

    job = JOBS[jid]
    job["status"] = "running"
    out_dir = MEDIA_DIR / jid
    out_dir.mkdir(parents=True, exist_ok=True)
    loop = asyncio.get_running_loop()

    def progress(done: int, total: int) -> None:
        job["done"] = done
        job["total"] = total

    try:
        # 1) OCR phu de chay -> cue (ngon ngu goc)
        job["phase"] = "ocr"
        cues = await loop.run_in_executor(
            None,
            lambda: ocr.extract_cues(
                req.url, fps=req.fps, region_top=req.region_top, region_height=req.region_height,
                start=req.start, duration=req.duration, min_score=req.min_score, progress=progress,
            ),
        )

        # 2) Dich sang tieng Viet
        if req.translate and cues:
            job["phase"] = "translate"
            job["done"] = 0
            job["total"] = len(cues)
            cues = await loop.run_in_executor(
                None,
                lambda: translate_mod.translate_cues(cues, req.target, req.source, req.translate_engine),
            )

        # 3) TTS tung cue
        job["phase"] = "tts"
        job["done"] = 0
        job["total"] = len(cues)
        ext = "mp3" if req.engine == "edge" else "wav"
        for index, cue in enumerate(cues):
            text = (cue.get("text") or "").strip()
            if text:
                name = f"{index:04d}.{ext}"
                await synthesize(text, str(out_dir / name), engine=req.engine, voice=req.voice)
                cue["audio"] = f"/api/dub/{jid}/media/{name}"
            job["done"] = index + 1

        job["cues"] = cues
        job["phase"] = "done"
        job["status"] = "done"
    except Exception as exc:  # noqa: BLE001
        job["status"] = "error"
        job["error"] = str(exc)


async def _run_ocr(jid: str, req: OcrRequest) -> None:
    import ocr  # nap tre: model OCR nang, chi tai khi that su OCR

    job = JOBS[jid]
    job["status"] = "running"
    loop = asyncio.get_running_loop()

    def progress(done: int, total: int) -> None:
        job["done"] = done
        job["total"] = total

    try:
        # OCR la CPU-bound + chan; chay trong executor de khong treo event loop.
        cues = await loop.run_in_executor(
            None,
            lambda: ocr.extract_cues(
                req.url,
                fps=req.fps,
                region_top=req.region_top,
                region_height=req.region_height,
                start=req.start,
                duration=req.duration,
                min_score=req.min_score,
                progress=progress,
            ),
        )
        job["cues"] = cues
        job["status"] = "done"
    except Exception as exc:  # noqa: BLE001
        job["status"] = "error"
        job["error"] = str(exc)
