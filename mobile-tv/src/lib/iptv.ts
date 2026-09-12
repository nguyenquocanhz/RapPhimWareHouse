/**
 * Kenh truyen hinh truc tiep lay tu iptv-org (kho playlist cong khai, hop phap).
 * Tai playlist Viet Nam (~80 kenh), phan tich M3U thanh danh sach kenh. Moi kenh la
 * mot luong HLS (.m3u8) nen phat bang dung trinh phat native cua man Xem.
 *
 * Lam thang o client cho gon (nguon la tep tinh cong khai), khong can sua backend.
 */
export interface Channel {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  url: string;
}

const M3U_URL = "https://iptv-org.github.io/iptv/countries/vn.m3u";

function attr(line: string, name: string): string {
  const m = line.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : "";
}

/** Bo cac the trong ngoac vuong ([Geo-blocked]...) cho ten kenh gon. */
function cleanName(s: string): string {
  return s
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  let cur: Partial<Channel> | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF")) {
      const comma = line.lastIndexOf(",");
      cur = {
        id: attr(line, "tvg-id"),
        name: cleanName(comma >= 0 ? line.slice(comma + 1) : ""),
        logo: attr(line, "tvg-logo") || undefined,
        group: attr(line, "group-title") || undefined,
      };
    } else if (line && !line.startsWith("#") && cur) {
      cur.url = line;
      if (cur.name && cur.url) out.push(cur as Channel);
      cur = null;
    }
  }
  return out;
}

export async function fetchChannels(): Promise<Channel[]> {
  const res = await fetch(M3U_URL, { headers: { accept: "*/*" } });
  if (!res.ok) throw new Error(`Không tải được danh sách kênh (${res.status})`);
  const text = await res.text();
  return parseM3U(text);
}
