import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Anh phim duoc phuc vu tu CDN cua hai nguon. Chi cho phep dung cac host nay
    // de tranh bien route toi uu anh thanh proxy mo.
    remotePatterns: [
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "*.phimimg.com" },
      { protocol: "https", hostname: "phim.nguonc.com" },
      { protocol: "https", hostname: "*.nguonc.com" },
      // Poster va anh dien vien cua trang Kham pha lay tu CDN cua TheMovieDB.
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
