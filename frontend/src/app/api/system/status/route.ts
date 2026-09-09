import { NextResponse } from "next/server";

/**
 * Cau noi cho bang tong quan cua trang quan tri.
 *
 * <p>Di qua day thay vi goi thang backend de trinh duyet khong can biet backend nam o
 * dau - cung ly do voi phu de va file NFO.</p>
 */
export async function GET() {
  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${base}/api/v1/status`, { cache: "no-store" });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Không kết nối được tới API." },
      { status: 502 },
    );
  }
}
