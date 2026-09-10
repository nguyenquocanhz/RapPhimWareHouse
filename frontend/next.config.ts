import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gom san mot ban chay doc lap kem node_modules toi thieu - anh Docker nho hon han
  // so voi viec chep ca cay thu vien.
  output: "standalone",

  images: {
    // Anh phim duoc phuc vu tu CDN cua hai nguon. Chi cho phep dung cac host nay
    // de tranh bien route toi uu anh thanh proxy mo.
    remotePatterns: [
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "*.phimimg.com" },
      { protocol: "https", hostname: "phim.nguonc.com" },
      { protocol: "https", hostname: "*.nguonc.com" },
      // VSMOV phuc vu anh ngay tren ten mien chinh, va mot so anh qua CDN nguon.vsphim.com.
      { protocol: "https", hostname: "vsmov.com" },
      { protocol: "https", hostname: "*.vsmov.com" },
      { protocol: "https", hostname: "*.vsphim.com" },
      // Poster va anh dien vien cua trang Kham pha lay tu CDN cua TheMovieDB.
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
