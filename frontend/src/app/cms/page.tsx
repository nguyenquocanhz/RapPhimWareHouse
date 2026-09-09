import type { Metadata } from "next";

import { SourceManager } from "@/components/admin/SourceManager";

export const metadata: Metadata = {
  title: "Quản trị nguồn phim",
  description: "Thêm nguồn phim mà không phải sửa mã nguồn.",
};

export default function AdminPage() {
  return <SourceManager />;
}
