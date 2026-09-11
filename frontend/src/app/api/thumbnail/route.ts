import { type NextRequest, NextResponse } from "next/server";

/**
 * Cau noi de <img> lay duoc anh poster cua kho rieng.
 *
 * Anh duoc backend sinh tu khung hinh video (ffmpeg) roi cache. Goi vong qua day cho
 * cung goc voi trang - giong /api/subtitle - thay vi tro thang vao backend noi bo.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return new NextResponse("Thiếu tham số slug.", { status: 400 });
  }

  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const target = `${base}/api/v1/homelab/thumbnail?slug=${encodeURIComponent(slug)}`;

  try {
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      // Khong co anh -> tra 404 de <Image> chuyen sang o giu cho.
      return new NextResponse("Không có ảnh.", { status: response.status });
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "content-type": response.headers.get("content-type") ?? "image/jpeg",
        // Anh khong doi, giu lai lau de khoi sinh lai.
        "cache-control": "public, max-age=604800",
      },
    });
  } catch {
    return new NextResponse("Không kết nối được tới kho phim.", { status: 502 });
  }
}
