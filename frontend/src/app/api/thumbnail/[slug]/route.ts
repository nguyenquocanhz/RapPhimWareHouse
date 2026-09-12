import { type NextRequest, NextResponse } from "next/server";

/**
 * Cau noi de <img> lay duoc anh poster cua kho rieng.
 *
 * Dung dang duong dan (/api/thumbnail/<slug>) chu khong query: next/image tu choi toi
 * uu local URL co query string. Anh do backend sinh tu khung hinh video (ffmpeg) roi
 * cache; goi vong qua day cho cung goc voi trang, giong /api/subtitle.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return new NextResponse("Thiếu slug.", { status: 400 });
  }

  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const target = `${base}/api/v1/homelab/thumbnail?slug=${encodeURIComponent(slug)}`;

  try {
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      return new NextResponse("Không có ảnh.", { status: response.status });
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "content-type": response.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=604800",
      },
    });
  } catch {
    return new NextResponse("Không kết nối được tới kho phim.", { status: 502 });
  }
}
