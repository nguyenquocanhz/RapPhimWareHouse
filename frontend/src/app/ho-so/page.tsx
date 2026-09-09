import { ProfileView } from "@/components/profile/ProfileView";

export const metadata = {
  title: "Hồ sơ",
  description: "Tên hiển thị, thống kê thư viện và công cụ quản lý dữ liệu của bạn.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
