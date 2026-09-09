import { NextResponse, type NextRequest } from "next/server";

/**
 * Cau noi toi cac endpoint quan tri cua backend.
 *
 * <p>Mot cau noi chung cho ca ba viec (xem, luu, xoa) thay vi ba tep rieng: chung chi
 * khac dong phuong thuc, viet rieng chi de lap lai.</p>
 *
 * <p>Khoa quan tri di thang tu trinh duyet qua day toi backend, khong duoc luu lai o
 * day. Trang quan tri cung chi giu no trong bo nho cua tab dang mo.</p>
 */

const BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

async function forward(request: NextRequest, path: string[], method: string) {
  const target = `${BASE}/api/v1/admin/${path.map(encodeURIComponent).join("/")}`;
  const token = request.headers.get("x-admin-token");

  try {
    const response = await fetch(target, {
      method,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-admin-token": token } : {}),
      },
      body: method === "GET" || method === "DELETE" ? undefined : await request.text(),
    });

    // Chuyen nguyen van ca than lan ma trang thai, de trang quan tri hien dung loi
    // nhan backend da soan chu khong phai mot cau chung chung.
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, status: 502, code: "UPSTREAM_ERROR", message: "Không kết nối được tới API." },
      { status: 502 },
    );
  }
}

type Params = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Params) {
  return forward(request, (await params).path, "GET");
}

export async function POST(request: NextRequest, { params }: Params) {
  return forward(request, (await params).path, "POST");
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return forward(request, (await params).path, "DELETE");
}
