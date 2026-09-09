import { NextResponse, type NextRequest } from "next/server";

import { api, ApiRequestError, errorMessage } from "@/lib/api";

/**
 * Cau noi giua trang thong bao (chay o trinh duyet) va backend.
 *
 * Trang thong bao phai doc thu vien trong localStorage nen bat buoc chay phia client,
 * ma backend chi mo CORS cho cong 3000. Goi vong qua route handler nay la cung goc
 * nen khong vuong CORS, va dia chi backend cung khong lo ra trinh duyet.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slugs = (params.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const provider = params.get("provider") ?? "kkphim";

  if (slugs.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await api.batch(slugs, provider);
    return NextResponse.json({ items });
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 500;
    return NextResponse.json({ message: errorMessage(error) }, { status });
  }
}
