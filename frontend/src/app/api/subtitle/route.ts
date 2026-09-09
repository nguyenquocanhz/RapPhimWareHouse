import { NextResponse, type NextRequest } from "next/server";

/**
 * Cau noi de the <track> lay duoc phu de cua kho rieng.
 *
 * The <track> doi phu de cung goc voi trang, neu khong phai bat crossOrigin tren ca
 * the <video> - ma lam vay thi duong phat co han cua kho cung bi doi CORS theo. Goi
 * vong qua day la cung goc, khong dong toi phan phat video.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return new NextResponse("Thiếu tham số key.", { status: 400 });
  }

  // Route handler chay tren server nen di duong noi bo, giong cac loi goi API khac.
  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const target = `${base}/api/v1/homelab/subtitle?key=${encodeURIComponent(key)}`;

  try {
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      return new NextResponse("Không tải được phụ đề.", { status: response.status });
    }

    return new NextResponse(await response.text(), {
      headers: {
        "content-type": "text/vtt; charset=utf-8",
        // Phu de khong doi trong mot tap, giu lai de doi tap khong tai lai.
        "cache-control": "public, max-age=21600",
      },
    });
  } catch {
    return new NextResponse("Không kết nối được tới kho phim.", { status: 502 });
  }
}
