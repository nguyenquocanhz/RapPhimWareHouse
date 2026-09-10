"""Tong hop giong noi (TTS) cho che do thuyet minh.

Hai bo may, chon luc goi:
- ``edge``  : Edge TTS (truc tuyen, giong neural cua Microsoft, chat luong cao). Xuat mp3.
- ``piper`` : Piper (ngoai tuyen, ONNX, chay CPU tren homelab). Can binary ``piper`` + model
              ``<voice>.onnx``. Xuat wav.

Ca hai deu ghi ra ``out_path`` cho truoc va khong tra ve gi.
"""
from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
from pathlib import Path

# Giong Edge tieng Viet (da thu chay duoc): nu HoaiMy, nam NamMinh.
DEFAULT_EDGE_VOICE = "vi-VN-HoaiMyNeural"
EDGE_VOICES = ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"]

# Piper: "voice" la ten model, tro toi <PIPER_MODEL_DIR>/<voice>.onnx.
DEFAULT_PIPER_VOICE = "vi_VN-vais1000-medium"
PIPER_BIN = os.environ.get("PIPER_BIN", "piper")
PIPER_MODEL_DIR = os.environ.get("PIPER_MODEL_DIR", "/models")


async def synthesize(text: str, out_path: str, engine: str = "edge", voice: str | None = None) -> None:
    """Doc ``text`` thanh audio, ghi ra ``out_path``."""
    if engine == "piper":
        await _piper(text, out_path, voice or DEFAULT_PIPER_VOICE)
    else:
        await _edge(text, out_path, voice or DEFAULT_EDGE_VOICE)


async def _edge(text: str, out_path: str, voice: str) -> None:
    import edge_tts  # nap tre de anh khong bat buoc phai co goi khi chi dung piper

    await edge_tts.Communicate(text, voice).save(out_path)


async def _piper(text: str, out_path: str, voice: str) -> None:
    model = Path(PIPER_MODEL_DIR) / f"{voice}.onnx"
    if not (shutil.which(PIPER_BIN) or Path(PIPER_BIN).exists()):
        raise RuntimeError("Chua cai Piper. Dat PIPER_BIN / PIPER_MODEL_DIR.")
    if not model.exists():
        raise RuntimeError(f"Thieu model Piper: {model}")

    def run() -> None:
        # Piper doc text tu stdin, xuat wav ra -f. Chay trong executor de khong chan event loop.
        subprocess.run(
            [PIPER_BIN, "-m", str(model), "-f", out_path],
            input=text.encode("utf-8"),
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    await asyncio.get_running_loop().run_in_executor(None, run)
