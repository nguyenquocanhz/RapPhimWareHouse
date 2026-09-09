# -*- coding: utf-8 -*-
"""Bo dung PDF cho quyen so tay su co.

Chi lo phan trinh bay: font, kieu chu, khung, muc luc, chan trang. Noi dung nam
o tep rieng, de sua chu khong phai dong vao cho nay.
"""
import os
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, ListFlowable,
                                ListItem, PageTemplate, Paragraph, Preformatted,
                                Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

# --------------------------------------------------------------------- font
#
# Khong ghim cung mot duong dan font: tep nay chay ca tren Windows lan Linux, ma
# hai ben khong he co font nao trung ten nhau.
#
# Va khong chon font theo tri nho. Georgia trong rat hop de lam sach, nhung no
# thieu phan lon glyph tieng Viet nen chu co dau in ra thanh o vuong. Phep thu
# dau tien cua toi la do be rong chuoi - no tra ve so dep ngay ca khi font khong
# he chua ky tu do, nen khong phat hien duoc gi. Cho nay doc thang bang cmap.

THU_MUC_FONT = [
    "C:/Windows/Fonts",
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    "/Library/Fonts",
    "/System/Library/Fonts",
    os.path.expanduser("~/.fonts"),
    os.path.expanduser("~/.local/share/fonts"),
]

# Xep theo do uu tien. Moi bo gom bon dang: thuong, dam, nghieng, dam nghieng.
BO_SERIF = [
    ("constan.ttf", "constanb.ttf", "constani.ttf", "constanz.ttf"),
    ("DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf",
     "DejaVuSerif-Italic.ttf", "DejaVuSerif-BoldItalic.ttf"),
    ("LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf",
     "LiberationSerif-Italic.ttf", "LiberationSerif-BoldItalic.ttf"),
    ("times.ttf", "timesbd.ttf", "timesi.ttf", "timesbi.ttf"),
]

BO_MONO = [
    ("consola.ttf", "consolab.ttf"),
    ("DejaVuSansMono.ttf", "DejaVuSansMono-Bold.ttf"),
    ("LiberationMono-Regular.ttf", "LiberationMono-Bold.ttf"),
    ("cour.ttf", "courbd.ttf"),
]


def _ky_tu_viet():
    """Tap ky tu rieng cua tieng Viet ma font bat buoc phai co."""
    tap = set("ăâđêôơưĂÂĐÊÔƠƯ")
    tap |= {chr(c) for c in range(0x1EA0, 0x1EFA)}      # A-cham-duoi den y-nga
    tap |= {chr(c) for c in (0x0102, 0x0103, 0x0110, 0x0111,
                             0x01A0, 0x01A1, 0x01AF, 0x01B0)}
    tap |= set("àáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ")
    return tap


def _quet_font():
    """Lap so duong dan tuyet doi cho tung ten tep font tim thay."""
    thay = {}
    for goc in THU_MUC_FONT:
        if not os.path.isdir(goc):
            continue
        for thu_muc, _, tep_trong_do in os.walk(goc):
            for ten in tep_trong_do:
                thay.setdefault(ten, os.path.join(thu_muc, ten))
    return thay


def _du_glyph(duong_dan):
    """True neu font chua het ky tu tieng Viet.

    Khong co fontTools thi bo qua phep kiem thay vi doan bua - thieu cong cu
    kiem khac han voi kiem xong thay dat.
    """
    try:
        from fontTools.ttLib import TTFont as _FT
    except ImportError:
        return True
    try:
        f = _FT(duong_dan, fontNumber=0, lazy=True)
        co = set()
        for bang_ma in f["cmap"].tables:
            co |= set(bang_ma.cmap.keys())
        f.close()
        return all(ord(c) in co for c in _ky_tu_viet())
    except Exception:
        return False


def _chon(cac_bo, co_san):
    for bo in cac_bo:
        duong_dan = [co_san.get(ten) for ten in bo]
        if all(duong_dan) and all(_du_glyph(d) for d in duong_dan):
            return duong_dan
    return None


def _nap_font():
    co_san = _quet_font()
    serif = _chon(BO_SERIF, co_san)
    mono = _chon(BO_MONO, co_san)
    if not serif or not mono:
        thieu = "serif" if not serif else "mono"
        raise SystemExit(
            "Khong tim thay bo font %s nao du glyph tieng Viet.\n"
            "Tren Debian/Ubuntu:  apt-get install fonts-dejavu-core\n"
            "Tren Windows:        da co san Constantia va Consolas." % thieu)

    for ten, duong_dan in zip(
            ("Serif", "Serif-B", "Serif-I", "Serif-BI"), serif):
        pdfmetrics.registerFont(TTFont(ten, duong_dan))
    for ten, duong_dan in zip(("Mono", "Mono-B"), mono):
        pdfmetrics.registerFont(TTFont(ten, duong_dan))
    pdfmetrics.registerFontFamily("Serif", normal="Serif", bold="Serif-B",
                                  italic="Serif-I", boldItalic="Serif-BI")
    return os.path.basename(serif[0]), os.path.basename(mono[0])


FONT_DANG_DUNG = _nap_font()

MUC = colors.HexColor("#1c3d5a")
NHAT = colors.HexColor("#5b6b7a")
NEN = colors.HexColor("#f4f2ed")
VIEN = colors.HexColor("#d8d2c6")
DO = colors.HexColor("#8c2f2f")
XANH = colors.HexColor("#2f6b4f")

TRANG = A4
LE = 21 * mm
RONG = TRANG[0] - 2 * LE


def _st(name, **kw):
    kw.setdefault("fontName", "Serif")
    return ParagraphStyle(name, **kw)


S = {
    "than": _st("than", fontSize=10.2, leading=15.4, alignment=TA_JUSTIFY,
                spaceAfter=6, textColor=colors.HexColor("#1a1a1a")),
    "h1": _st("h1", fontName="Serif-B", fontSize=20, leading=24, textColor=MUC,
              spaceBefore=0, spaceAfter=13),
    "h2": _st("h2", fontName="Serif-B", fontSize=13.2, leading=16.5, textColor=MUC,
              spaceBefore=15, spaceAfter=6),
    "h3": _st("h3", fontName="Serif-BI", fontSize=11, leading=14,
              textColor=colors.HexColor("#31506b"), spaceBefore=11, spaceAfter=4),
    "phan": _st("phan", fontName="Serif-B", fontSize=29, leading=35,
                alignment=TA_CENTER, textColor=MUC),
    "phansub": _st("phansub", fontSize=11.5, leading=17, alignment=TA_CENTER,
                   textColor=NHAT, spaceBefore=10),
    "ma": ParagraphStyle("ma", fontName="Mono", fontSize=8.3, leading=11.4,
                         textColor=colors.HexColor("#20303d")),
    "cham": _st("cham", fontSize=10.2, leading=15, alignment=TA_JUSTIFY,
                spaceAfter=3),
    "nhan": _st("nhan", fontName="Serif-B", fontSize=8.6, leading=11,
                textColor=colors.white),
    "trichdan": _st("trichdan", fontName="Serif-I", fontSize=11, leading=16.5,
                    textColor=MUC, leftIndent=14, rightIndent=10, spaceAfter=8),
    "chugiai": _st("chugiai", fontSize=8.8, leading=12.5, textColor=NHAT,
                   alignment=TA_JUSTIFY),
    "bia-ten": _st("bia-ten", fontName="Serif-B", fontSize=32, leading=38,
                   alignment=TA_CENTER, textColor=MUC),
    "bia-phu": _st("bia-phu", fontName="Serif-I", fontSize=13, leading=19,
                   alignment=TA_CENTER, textColor=NHAT),
    "bia-nho": _st("bia-nho", fontSize=10, leading=15, alignment=TA_CENTER,
                   textColor=NHAT),
    "bang": _st("bang", fontSize=9.1, leading=12.6),
    "bang-d": _st("bang-d", fontName="Serif-B", fontSize=9.1, leading=12.6,
                  textColor=colors.white),
}


def mk(s):
    """Doi mini-markup thanh the cua reportlab, escape truoc de an toan."""
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"`([^`]+)`",
               r'<font face="Mono" size="8.8" color="#1c3d5a">\1</font>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", s)
    return s


def P(t, st="than"):
    return Paragraph(mk(t), S[st])


def _be_dong(text, rong=95):
    """Be dong ma qua dai: khoi ma khong tu xuong dong nhu doan van."""
    ra = []
    for dong in text.split("\n"):
        while len(dong) > rong:
            cat = dong.rfind(" ", 0, rong)
            if cat < rong * 0.5:
                cat = rong
            ra.append(dong[:cat])
            dong = "    " + dong[cat:].lstrip()
        ra.append(dong)
    return "\n".join(ra)


def khoi_ma(text, nhan=None):
    noi = [Preformatted(_be_dong(text), S["ma"])]
    if nhan:
        noi.insert(0, Paragraph(mk(nhan), ParagraphStyle(
            "n", parent=S["chugiai"], fontName="Serif-BI", spaceAfter=3)))
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


def hop(tieu_de, dong, mau=MUC):
    """Khung co dai mau, dung cho Bai hoc / Canh bao / Chan doan."""
    dau = Table([[Paragraph(mk(tieu_de), S["nhan"])]], colWidths=[RONG])
    dau.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), mau),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    than = Table([[[P(x) for x in dong]]], colWidths=[RONG])
    than.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fbfaf7")),
        ("BOX", (0, 0), (-1, -1), 0.4, mau),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return KeepTogether([dau, than, Spacer(1, 9)])


def bang(dau, hang, rong=None):
    du = [[Paragraph(mk(c), S["bang-d"]) for c in dau]]
    du += [[Paragraph(mk(c), S["bang"]) for c in h] for h in hang]
    t = Table(du, colWidths=rong, repeatRows=1, hAlign="LEFT")
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
    return KeepTogether([t, Spacer(1, 9)])


def cham(items):
    return ListFlowable(
        [ListItem(P(x, "cham"), leftIndent=16, value="circle") for x in items],
        bulletType="bullet", start="circle", leftIndent=14,
        bulletFontSize=5, spaceAfter=7)


class Sach(BaseDocTemplate):
    """Chen tieu de chay, so trang, va ghi nhan muc luc."""

    def __init__(self, path, **kw):
        BaseDocTemplate.__init__(self, path, pagesize=TRANG,
                                 leftMargin=LE, rightMargin=LE,
                                 topMargin=20 * mm, bottomMargin=18 * mm, **kw)
        khung = Frame(LE, 18 * mm, RONG, TRANG[1] - 38 * mm, id="chinh")
        self.chuong = ""
        self.addPageTemplates([
            PageTemplate(id="bia", frames=[Frame(LE, 18 * mm, RONG,
                                                 TRANG[1] - 38 * mm, id="b")]),
            PageTemplate(id="than", frames=[khung], onPageEnd=self._trang),
        ])

    def _trang(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Serif", 8)
        canvas.setFillColor(NHAT)
        if self.chuong:
            canvas.drawString(LE, TRANG[1] - 13 * mm, self.chuong[:78])
        canvas.setStrokeColor(VIEN)
        canvas.setLineWidth(0.4)
        canvas.line(LE, TRANG[1] - 15 * mm, TRANG[0] - LE, TRANG[1] - 15 * mm)
        canvas.line(LE, 14 * mm, TRANG[0] - LE, 14 * mm)
        canvas.drawCentredString(TRANG[0] / 2, 10 * mm, str(canvas.getPageNumber()))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph):
            return
        kieu = flowable.style.name
        if kieu in ("h1", "h2"):
            chu = re.sub(r"<[^>]+>", "", flowable.getPlainText())
            # Trang muc luc khong tu liet ke chinh no.
            if chu.strip() == "Mục lục":
                return
            self.notify("TOCEntry", (0 if kieu == "h1" else 1, chu, self.page))
            if kieu == "h1":
                self.chuong = chu


def muc_luc():
    t = TableOfContents()
    t.levelStyles = [
        ParagraphStyle("t0", fontName="Serif-B", fontSize=10.4, leading=19,
                       textColor=MUC),
        ParagraphStyle("t1", fontName="Serif", fontSize=9.6, leading=15,
                       leftIndent=16, textColor=colors.HexColor("#33414d")),
    ]
    return t
