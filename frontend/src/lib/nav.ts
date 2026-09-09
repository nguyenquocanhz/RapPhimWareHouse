import type { Chip } from "@/components/movie/ChipBar";
import type { ProviderCode } from "@/lib/types";

/** Cac nhom danh sach hien tren dai chip. */
const LIST_TYPES: Array<{ slug: string; label: string }> = [
  { slug: "phim-bo", label: "Phim bộ" },
  { slug: "phim-le", label: "Phim lẻ" },
  { slug: "tv-shows", label: "TV Shows" },
  { slug: "hoat-hinh", label: "Hoạt hình" },
  { slug: "phim-vietsub", label: "Vietsub" },
  { slug: "phim-thuyet-minh", label: "Thuyết minh" },
  { slug: "phim-long-tieng", label: "Lồng tiếng" },
];

const PROVIDERS: Array<{ code: ProviderCode; label: string }> = [
  { code: "kkphim", label: "Nguồn KKPhim" },
  { code: "nguonc", label: "Nguồn NguonC" },
  { code: "homelab", label: "Kho riêng" },
];

/** Chi kem tham so provider vao URL khi khac gia tri mac dinh. */
export function withProvider(path: string, provider: ProviderCode): string {
  return provider === "kkphim" ? path : `${path}?provider=${provider}`;
}

/**
 * Dai chip dung chung cho trang chu va cac trang danh sach:
 * dieu huong nhanh giua cac nhom phim va doi nguon du lieu.
 *
 * @param activePath duong dan dang xem, dung de danh dau chip hien hanh
 * @param provider   nguon dang chon, giu nguyen khi chuyen nhom
 */
export function buildChips(activePath: string, provider: ProviderCode): Chip[] {
  const typeChips: Chip[] = [
    {
      label: "Mới cập nhật",
      href: withProvider("/", provider),
      active: activePath === "/",
    },
    ...LIST_TYPES.map((type) => ({
      label: type.label,
      href: withProvider(`/danh-sach/${type.slug}`, provider),
      active: activePath === `/danh-sach/${type.slug}`,
    })),
  ];

  // Kham pha lay du lieu tu TMDB nen khong gan voi nguon phim nao.
  const discoverChip: Chip = {
    label: "Khám phá TMDB",
    href: "/kham-pha",
    active: activePath === "/kham-pha",
  };

  const providerChips: Chip[] = PROVIDERS.map((item) => ({
    label: item.label,
    href: withProvider(activePath, item.code),
    active: provider === item.code,
  }));

  return [...typeChips, discoverChip, ...providerChips];
}

/**
 * Doc tham so provider tu URL, moi gia tri la khac deu quy ve kkphim.
 *
 * Doi chieu voi chinh danh sach {@link PROVIDERS} chu khong liet ke tay tung ma:
 * them nguon moi ma quen sua o day thi URL cua no se am tham roi ve kkphim.
 */
export function readProvider(value: string | string[] | undefined): ProviderCode {
  const raw = Array.isArray(value) ? value[0] : value;
  return PROVIDERS.some((item) => item.code === raw) ? (raw as ProviderCode) : "kkphim";
}

/** Doc so trang tu URL, luon tra ve so nguyen duong. */
export function readPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export { LIST_TYPES };
