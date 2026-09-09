# -*- coding: utf-8 -*-
"""Rap cac phan lai va xuat ra PDF.

Dung multiBuild de muc luc co so trang dung: lan chay dau thu thap vi tri tieu de,
lan sau moi dien duoc so trang vao muc luc.
"""
import sys

from reportlab.platypus import NextPageTemplate, PageBreak

import phan_a
import phan_b
from render import Sach, muc_luc

RA = sys.argv[1] if len(sys.argv) > 1 else "sach.pdf"


def dung():
    toc = muc_luc()
    truyen = []

    truyen += phan_a.bia()
    truyen += [NextPageTemplate("than")]
    truyen += phan_a.ve_quyen_sach()
    truyen += phan_a.muc_luc_trang(toc)

    truyen += phan_a.phan_i()
    truyen += phan_a.phan_ii()
    truyen += phan_a.phan_iii()
    truyen += phan_b.phan_iv()
    truyen += phan_b.phan_v()
    truyen += phan_b.phan_vi()
    truyen += phan_b.phu_luc()

    sach = Sach(RA, title="Tu Commit Den Container",
                author="nguyenquocanhz",
                subject="Git, GitHub CLI, Docker - so tay su co")
    sach.multiBuild(truyen)
    return sach.page


if __name__ == "__main__":
    so_trang = dung()
    print("Da xuat %s (%d trang)" % (RA, so_trang))
