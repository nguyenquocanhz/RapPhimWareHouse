import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { api, safe } from "@/lib/api";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RapPhim - Xem phim online",
    template: "%s | RapPhim",
  },
  description:
    "Kho phim tổng hợp từ KKPhim và NguonC: phim bộ, phim lẻ, TV Shows và hoạt hình, cập nhật liên tục.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Danh muc dung chung cho sidebar o moi trang. Neu backend chua chay thi
  // van render duoc khung ung dung voi danh muc rong.
  const [categories, countries] = await Promise.all([
    safe(api.categories(), []),
    safe(api.countries(), []),
  ]);

  return (
    <html lang="vi" className={roboto.variable} suppressHydrationWarning>
      <head>
        {/* Dat giao dien sang truoc khung hinh dau tien de khong bi nhay mau khi tai lai. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(JSON.parse(localStorage.getItem("rapphim.theme"))==="light")document.documentElement.classList.add("light")}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans">
        <AppShell categories={categories} countries={countries}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
