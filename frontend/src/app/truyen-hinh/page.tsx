import { TvChannelsView } from "@/components/tv/TvChannelsView";
import { ErrorState } from "@/components/ui/States";
import { api, errorMessage, isUnreachable } from "@/lib/api";
import type { TvChannel } from "@/lib/types";

export const metadata = {
  title: "Truyền hình trực tiếp",
  description: "Xem các kênh truyền hình Việt Nam trực tiếp (nguồn iptv-org).",
};

export default async function TvPage() {
  let channels: TvChannel[] | null = null;
  let failure: string | null = null;
  let unreachable = false;

  try {
    channels = await api.channels();
  } catch (error) {
    failure = errorMessage(error);
    unreachable = isUnreachable(error);
  }

  if (!channels) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <ErrorState
          message={failure ?? "Không tải được danh sách kênh."}
          unreachable={unreachable}
        />
      </div>
    );
  }

  return <TvChannelsView channels={channels} />;
}
