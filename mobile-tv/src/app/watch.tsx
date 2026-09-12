import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { theme } from "../lib/theme";
import { BackButton } from "../components/BackButton";

/** Nhan biet URL phat truc tiep (native player) so voi trang nhung (WebView). */
function isDirect(u: string): boolean {
  return /\.(m3u8|mp4|mkv|webm|mov)(\?|$)/i.test(u);
}

export default function Watch() {
  const params = useLocalSearchParams<{
    title?: string;
    m3u8?: string;
    embed?: string;
  }>();

  const m3u8 = params.m3u8 ?? "";
  const embed = params.embed ?? "";

  // Uu tien phat truc tiep bang trinh phat native (remote dieu khien tot).
  const directUrl = m3u8 || (isDirect(embed) ? embed : "");
  // Khong co link truc tiep thi nhung trang phat cua nguon qua WebView.
  const embedUrl = directUrl ? "" : embed;

  // Giu man hinh sang trong khi xem (khong de trinh bao ve man / ngu tat khi dang phat).
  useKeepAwake();

  // Hook phai goi vo dieu kien; nguon rong thi player dung yen.
  const player = useVideoPlayer(directUrl || null, (p) => {
    p.staysActiveInBackground = false;
    // Bao dam co tieng: bo tat tieng va dat am luong toi da (phong khi mac dinh bi tat).
    p.muted = false;
    p.volume = 1.0;
    if (directUrl) p.play();
  });

  if (directUrl) {
    return (
      <View style={styles.screen}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="contain"
          nativeControls
        />
        <BackButton overlay />
      </View>
    );
  }

  if (embedUrl) {
    return (
      <View style={styles.screen}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.web}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
        />
        <BackButton overlay />
      </View>
    );
  }

  return (
    <View style={[styles.screen, styles.center]}>
      <Text style={styles.msg}>Không có nguồn phát cho tập này.</Text>
      {params.title ? <Text style={styles.sub}>{params.title}</Text> : null}
      <View style={{ marginTop: 24 }}>
        <BackButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  web: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  msg: { color: theme.text, fontSize: 20, fontWeight: "600" },
  sub: { color: theme.textDim, fontSize: 15 },
});
