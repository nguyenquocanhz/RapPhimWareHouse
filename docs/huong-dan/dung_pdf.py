# -*- coding: utf-8 -*-
"""Dung PDF cho bo tai lieu huong dan RapPhim tu chinh cac tep Markdown.

Tai dung lop trinh bay o docs/ebook/render.py (da kiem phong tieng Viet, kieu
chu, khung, muc luc, chan trang). Cho nay chi lam mot viec: doc cac tep .md roi
anh xa tung phan Markdown (tieu de, khoi ma, bang, danh sach, trich dan, doan
van) sang cac flowable cua reportlab. Nguon duy nhat van la cac tep .md.

Chay:
    cd docs/huong-dan
    python dung_pdf.py RapPhim-Huong-Dan.pdf
"""
import os
import re
import sys

# render.py nam o docs/ebook - nap font va dinh nghia kieu chu khi import.
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "ebook"))

from reportlab.lib import colors                       # noqa: E402
from reportlab.lib.units import mm                     # noqa: E402
from reportlab.lib.styles import ParagraphStyle        # noqa: E402
from reportlab.platypus import (KeepTogether, ListFlowable, ListItem,  # noqa: E402
                                NextPageTemplate, PageBreak, Paragraph,
                                Preformatted, Spacer, Table, TableStyle)

from render import (NHAT, MUC, NEN, VIEN, RONG, S, Sach,  # noqa: E402
                    _be_dong, muc_luc)

# Cac tep noi dung, dung thu tu. README (muc luc) dat dau lam loi mo.
THU_TU = [
    "README.md",
    "00-tong-quan-he-thong.md",
    "01-cai-dat-moi-truong-phat-trien.md",
    "02-kien-truc-he-thong.md",
    "03-them-nguon-phim-moi.md",
    "04-tai-lieu-api.md",
    "05-trien-khai-docker-homelab.md",
    "06-tham-chieu-cau-hinh.md",
    "07-xu-ly-su-co.md",
]


# --------------------------------------------------------------- inline markup
def _links_ra_the(s):
    """[chu](url): url http -> lien ket bam duoc; url tuong doi -> chi giu chu."""
    def thay(m):
        chu, url = m.group(1), m.group(2)
        if url.startswith("http"):
            # Dung ky tu dieu khien lam cho de escape khong dung vao, roi khoi phuc.
            return "\x01" + url + "\x02" + chu + "\x03"
        return chu
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", thay, s)


def imk(s):
    """Giong render.mk nhung xu ly them lien ket Markdown."""
    s = _links_ra_the(s)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"`([^`]+)`",
               r'<font face="Mono" size="8.8" color="#1c3d5a">\1</font>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", s)
    s = re.sub(r"\x01([^\x02]+)\x02([^\x03]+)\x03",
               r'<a href="\1" color="#1c3d5a">\2</a>', s)
    return s


def _plain(s):
    """Bo markup de do do dai o (uoc luong be rong cot)."""
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return re.sub(r"[`*]", "", s)


def P(t, st="than"):
    return Paragraph(imk(t), S[st])


# ------------------------------------------------------------------- cac khoi
def _code_box(seg, nhan):
    # Preformatted o reportlab ban nay hien text nguyen van, KHONG parse XML - nen
    # khong escape (escape se lam && thanh &amp;&amp;). Giong khoi_ma goc cua ebook.
    noi = [Preformatted(seg, S["ma"])]
    if nhan:
        noi.insert(0, Paragraph(nhan, ParagraphStyle(
            "cl", parent=S["chugiai"], fontName="Serif-BI", spaceAfter=3)))
    t = Table([[noi]], colWidths=[RONG])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NEN),
        ("BOX", (0, 0), (-1, -1), 0.4, VIEN),
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, MUC),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return KeepTogether([t, Spacer(1, 8)])


def code_block(text, lang):
    """Khoi ma. Cat thanh nhieu hop <=38 dong de khong bao gio cao qua mot trang."""
    wrapped = _be_dong(text)
    dong = wrapped.split("\n")
    CHUNK = 38
    ra = []
    for k in range(0, len(dong), CHUNK):
        seg = "\n".join(dong[k:k + CHUNK])
        nhan = lang if k == 0 else ((lang + " (tiep)") if lang else "(tiep)")
        ra.append(_code_box(seg, nhan))
    return ra


def quote_box(lines):
    paras = [Paragraph(imk(x), S["chugiai"]) for x in lines if x.strip()]
    if not paras:
        return [Spacer(1, 2)]
    t = Table([[paras]], colWidths=[RONG])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fbfaf7")),
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, NHAT),
        ("BOX", (0, 0), (-1, -1), 0.4, VIEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [KeepTogether([t, Spacer(1, 8)])]


def _be_rong_cot(dau, hang, tong):
    ncol = len(dau)
    maxlen = [max(4, len(_plain(dau[c]))) for c in range(ncol)]
    for h in hang:
        for c in range(min(ncol, len(h))):
            maxlen[c] = max(maxlen[c], len(_plain(h[c])))
    tongdo = sum(maxlen) or ncol
    rong = [max(tong * 0.07, tong * ml / tongdo) for ml in maxlen]
    he_so = tong / sum(rong)
    return [w * he_so for w in rong]


def table_block(dau, hang):
    ncol = len(dau)
    du = [[Paragraph(imk(c), S["bang-d"]) for c in dau]]
    for h in hang:
        h = (list(h) + [""] * ncol)[:ncol]
        du.append([Paragraph(imk(c), S["bang"]) for c in h])
    t = Table(du, colWidths=_be_rong_cot(dau, hang, RONG),
              repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), MUC),
        ("GRID", (0, 0), (-1, -1), 0.4, VIEN),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.white, colors.HexColor("#f7f5f1")]),
    ]))
    # Khong boc KeepTogether: bang dai duoc phep tach trang, dong tieu de lap lai.
    return [t, Spacer(1, 9)]


def cham_list(items):
    return [ListFlowable(
        [ListItem(P(x, "cham"), leftIndent=16, value="circle") for x in items],
        bulletType="bullet", start="circle", leftIndent=14,
        bulletFontSize=5, spaceAfter=7)]


def so_list(items):
    return [ListFlowable(
        [ListItem(P(x, "cham"), leftIndent=18) for x in items],
        bulletType="1", bulletFormat="%s.", leftIndent=16, spaceAfter=7)]


# -------------------------------------------------------------------- parser
def _la_dau_khoi(line):
    s = line.strip()
    return bool(
        s.startswith("```") or re.match(r"^#{1,6}\s", s) or s.startswith(">")
        or s.startswith("|") or re.match(r"^[-*]\s", s)
        or re.match(r"^\d+\.\s", s) or re.match(r"^(-{3,}|\*{3,})$", s))


def _tach_hang(line):
    line = line.strip().strip("|")
    line = line.replace("\\|", "\x00")
    return [c.strip().replace("\x00", "|") for c in line.split("|")]


def parse(md):
    dong = md.split("\n")
    flow = []
    i, n = 0, len(dong)
    while i < n:
        line = dong[i]
        s = line.strip()

        if s.startswith("```"):
            lang = s[3:].strip()
            buf = []
            i += 1
            while i < n and not dong[i].strip().startswith("```"):
                buf.append(dong[i])
                i += 1
            i += 1
            flow += code_block("\n".join(buf), lang)
            continue

        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            lv = len(m.group(1))
            st = {1: "h1", 2: "h2", 3: "h3"}.get(lv, "h3")
            flow.append(P(m.group(2).strip(), st))
            i += 1
            continue

        if re.match(r"^(-{3,}|\*{3,})$", s):
            flow.append(Spacer(1, 5))
            i += 1
            continue

        if s.startswith(">"):
            buf = []
            while i < n and dong[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", dong[i]))
                i += 1
            flow += quote_box(buf)
            continue

        if s.startswith("|") and i + 1 < n and re.match(
                r"^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$", dong[i + 1]):
            dau = _tach_hang(line)
            i += 2
            hang = []
            while i < n and dong[i].strip().startswith("|"):
                hang.append(_tach_hang(dong[i]))
                i += 1
            flow += table_block(dau, hang)
            continue

        if re.match(r"^[-*]\s+", s):
            items = []
            while i < n and re.match(r"^\s*[-*]\s+", dong[i]):
                items.append(re.sub(r"^\s*[-*]\s+", "", dong[i]))
                i += 1
            flow += cham_list(items)
            continue

        if re.match(r"^\d+\.\s+", s):
            items = []
            while i < n and re.match(r"^\s*\d+\.\s+", dong[i]):
                items.append(re.sub(r"^\s*\d+\.\s+", "", dong[i]))
                i += 1
            flow += so_list(items)
            continue

        if s == "":
            i += 1
            continue

        buf = [line]
        i += 1
        while i < n and dong[i].strip() != "" and not _la_dau_khoi(dong[i]):
            buf.append(dong[i])
            i += 1
        flow.append(P(" ".join(x.strip() for x in buf)))
    return flow


# ---------------------------------------------------------------------- bia
def bia():
    return [
        Spacer(1, 58 * mm),
        Paragraph("RapPhim WareHouse", S["bia-ten"]),
        Spacer(1, 6 * mm),
        Paragraph("Bộ tài liệu hướng dẫn", S["bia-phu"]),
        Spacer(1, 3 * mm),
        Paragraph("Tổng quan · Kiến trúc · Phát triển · API · Triển khai · Vận hành",
                  S["bia-nho"]),
        Spacer(1, 42 * mm),
        Paragraph("Phiên bản 1.0 — 2026-09-11", S["bia-nho"]),
        Spacer(1, 2 * mm),
        Paragraph("Backend Spring Boot 4.1 (Java 17) · Frontend Next.js 16 (React 19)",
                  S["bia-nho"]),
    ]


def trang_muc_luc(toc):
    return [P("Mục lục", "h1"), toc]


def dung(ra):
    truyen = []
    truyen += bia()
    truyen += [NextPageTemplate("than"), PageBreak()]
    truyen += trang_muc_luc(muc_luc())

    for ten in THU_TU:
        duong = os.path.join(HERE, ten)
        if not os.path.isfile(duong):
            continue
        with open(duong, encoding="utf-8") as f:
            md = f.read()
        truyen.append(PageBreak())
        truyen += parse(md)

    sach = Sach(ra, title="RapPhim WareHouse - Bo tai lieu huong dan",
                author="nguyenquocanhz",
                subject="Kien truc, phat trien, API, trien khai, van hanh")
    sach.multiBuild(truyen)
    return sach.page


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "RapPhim-Huong-Dan.pdf"
    so = dung(out)
    print("Da xuat %s (%d trang)" % (out, so))
