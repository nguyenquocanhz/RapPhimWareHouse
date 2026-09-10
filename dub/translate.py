"""Dich cue phu de sang tieng Viet.

Hai bo may (giong TTS: online chay ngay, offline tuy chon):
- ``google`` : deep-translator GoogleTranslator (truc tuyen, chat luong cao, dich thang
               zh -> vi, tu nhan dien ngon ngu nguon). Mac dinh.
- ``argos``  : argostranslate (ngoai tuyen). Nhieu cap phai bac cau qua tieng Anh
               (zh -> en -> vi); can cai san goi ngon ngu tuong ung.

``translate_cues`` giu nguyen moc gio, doi ``text`` sang ban dich va luu ban goc o
``text_src`` de doi chieu.
"""
from __future__ import annotations

from typing import Optional

DEFAULT_TARGET = "vi"
_CHUNK = 50  # deep-translator gioi han so luong / do dai moi lan, chia lo cho an toan


def translate_cues(cues: list[dict], target: str = DEFAULT_TARGET,
                   source: str = "auto", engine: str = "google") -> list[dict]:
    texts = [c.get("text", "") for c in cues]
    translated = translate_texts(texts, target, source, engine)
    out: list[dict] = []
    for cue, vi in zip(cues, translated):
        src_text = cue.get("text", "")
        out.append({**cue, "text": (vi or src_text), "text_src": src_text})
    return out


def translate_texts(texts: list[str], target: str = DEFAULT_TARGET,
                    source: str = "auto", engine: str = "google") -> list[str]:
    if not texts:
        return []
    if engine == "argos":
        return _argos(texts, target, source)
    return _google(texts, target, source)


def _google(texts: list[str], target: str, source: str) -> list[str]:
    from deep_translator import GoogleTranslator

    src = "auto" if source in (None, "", "auto") else source
    translator = GoogleTranslator(source=src, target=target)
    results: list[str] = []
    for i in range(0, len(texts), _CHUNK):
        # Chuoi rong lam translate_batch bao loi; thay bang khoang trang roi tra lai rong.
        chunk = [t if t.strip() else " " for t in texts[i:i + _CHUNK]]
        out = translator.translate_batch(chunk)
        results.extend(o if (o and o.strip()) else "" for o in out)
    return results


def _argos(texts: list[str], target: str, source: str) -> list[str]:
    import argostranslate.translate as at

    src = "zh" if source in (None, "", "auto") else source

    def one(text: str) -> str:
        if not text.strip():
            return ""
        try:
            return at.translate(text, src, target)
        except Exception:
            # Khong co duong thang src->target: bac cau qua tieng Anh.
            return at.translate(at.translate(text, src, "en"), "en", target)

    return [one(t) for t in texts]
