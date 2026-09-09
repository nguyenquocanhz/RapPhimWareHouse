import { NextResponse, type NextRequest } from "next/server";

/**
 * Cau noi de tai file NFO ma khong can biet dia chi backend.
 *
 * <p>Day la lien ket trinh duyet mo, nen truoc kia no phai la dia chi tuyet doi cua
 * backend - va vi dia chi do bi nhung vao ma luc build, anh Docker dung duoc o may nay
 * lai vo dung o may khac. Cho di vong qua day thi trinh duyet chi can biet chinh no,
 * con dia chi backend do server doc luc chay.</p>
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slug = params.get("slug");
  if (!slug) {
    return new NextResponse("Thiếu tham số slug.", { status: 400 });
  }

  const provider = params.get("provider");
  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

  const query = provider && provider !== "kkphim" ? `?provider=${encodeURIComponent(provider)}` : "";
  const target = `${base}/api/v1/movies/${encodeURIComponent(slug)}/nfo${query}`;

  try {
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      return new NextResponse("Không tạo được file NFO.", { status: response.status });
    }

    return new NextResponse(await response.text(), {
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/xml; charset=utf-8",
        // Giu nguyen ten tep backend dat, khong thi trinh duyet luu thanh "nfo".
        "content-disposition":
          response.headers.get("content-disposition") ?? `attachment; filename="${slug}.nfo"`,
      },
    });
  } catch {
    return new NextResponse("Không kết nối được tới API.", { status: 502 });
  }
}
