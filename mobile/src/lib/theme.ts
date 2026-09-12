/** Bang mau RapPhim - toi, do thuong hieu. Dung chung cho toan app. */
export const theme = {
  bg: "#0f0f0f",
  surface: "#1c1c1c",
  surface2: "#272727",
  border: "#303030",
  text: "#ffffff",
  textDim: "#aaaaaa",
  textMuted: "#717171",
  primary: "#ff0033",
  primaryDim: "#cc0029",
} as const;

export type Theme = typeof theme;
