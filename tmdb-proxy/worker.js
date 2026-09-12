// Cloudflare Worker: proxy cho TheMovieDB.
//
// Vi sao can: mot so ISP (vi du o Viet Nam) chan api.themoviedb.org theo SNI/DPI -
// ket noi bi reset ngay luc bat tay TLS, du DNS da tra dung IP. Worker chay tren
// *.workers.dev (khong bi chan) dung lam cau noi: backend/trinh duyet goi Worker,
// Worker goi thang TMDB roi tra ve.
//
// Duong dan:
//   /3/...    ->  https://api.themoviedb.org/3/...     (REST API)
//   /t/p/...  ->  https://image.tmdb.org/t/p/...       (CDN anh)
//
// Backend giu nguyen viec gan token (header Authorization hoac ?api_key) - Worker
// chi chuyen tiep, khong dung/luu token.

const API = "https://api.themoviedb.org";
const IMG = "https://image.tmdb.org";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    let upstream;
    if (url.pathname.startsWith("/t/p/")) {
      upstream = IMG + url.pathname + url.search;
    } else if (url.pathname.startsWith("/3/")) {
      upstream = API + url.pathname + url.search;
    } else {
      return new Response("RapPhim TMDB proxy. Dung /3/... (API) hoac /t/p/... (anh).", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Chi chuyen cac header can thiet len TMDB (tranh header rieng cua Cloudflare).
    const headers = new Headers();
    for (const name of ["authorization", "accept", "content-type"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const upstreamRequest = new Request(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    });

    const response = await fetch(upstreamRequest);

    // Cho phep frontend (next/image) tai anh qua Worker o moi goc.
    const outHeaders = new Headers(response.headers);
    outHeaders.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, { status: response.status, headers: outHeaders });
  },
};
