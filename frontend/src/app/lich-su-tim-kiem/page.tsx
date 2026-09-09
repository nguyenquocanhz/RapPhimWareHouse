import { SearchHistoryView } from "@/components/library/SearchHistoryView";

export const metadata = {
  title: "Lịch sử tìm kiếm",
  description: "Các từ khoá bạn đã tìm, lưu ngay trên trình duyệt này.",
};

export default function SearchHistoryPage() {
  return <SearchHistoryView />;
}
