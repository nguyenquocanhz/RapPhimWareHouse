import type { NextRequest } from "next/server";

/**
 * Cau noi cung goc toi dich vu thuyet minh (rapphim-dub).
 *
 * Trinh duyet khong goi thang dich vu dub duoc (khac goc, va dia chi noi bo chi may chu
 * thay); moi loi goi /api/dub/* di qua day roi may chu Next chuyen tiep. Media (mp3) tra
 * ve dang nhi phan nen chuyen thang than phan hoi, khong doc thanh chuoi.
 */
const DUB_URL =
  process.env.DUB_INTERNAL_URL ?? process.env.NEXT_PUBLIC_DUB_URL ?? "http://localhost:8199";

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${DUB_URL}/api/dub/${path.join("/")}${req.nextUrl.search}`;

  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    init.headers = { "content-type": req.headers.get("content-type") ?? "application/json" };
  }

  try {
    const res = await fetch(target, init);
    return new Response(res.body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/octet-stream",
        // Cho phep tua trong audio (Range) va cache media ngan.
        "cache-control": res.headers.get("cache-control") ?? "no-store",
      },
    });
  } catch {
    return Response.json(
      { detail: `Không kết nối được dịch vụ thuyết minh tại ${DUB_URL}.` },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
