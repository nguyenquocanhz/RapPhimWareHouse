import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Bo icon dang net day 24x24, cung phong cach voi thanh dieu huong cua YouTube. */
function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      width={24}
      height={24}
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 6H3V5h18v1zm0 5H3v1h18v-1zm0 6H3v1h18v-1z" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.87 20.17l-5.59-5.59C16.35 13.35 17 11.75 17 10c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.75 0 3.35-.65 4.58-1.71l5.59 5.59.7-.71zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10v10h5v-6h6v6h5V10l-8-6-8 6zm15 9h-3v-6H8v6H5v-8.5l7-5.25 7 5.25V19z" />
    </Icon>
  );
}

export function SeriesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 6H3v13h18V6zm-1 12H4V7h16v11zM8 3.5l3.5 2.5h1.8L9.8 3.5H8zm5.5 0L17 6h1.8L15.3 3.5h-1.8z" />
    </Icon>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4h16v16H4V4zm1 1v2h2V5H5zm4 0v6h6V5H9zm8 0v2h2V5h-2zM5 8v2h2V8H5zm12 0v2h2V8h-2zM5 11v2h2v-2H5zm12 0v2h2v-2h-2zM5 14v2h2v-2H5zm4 0v5h6v-5H9zm8 0v2h2v-2h-2zM5 17v2h2v-2H5zm12 0v2h2v-2h-2z" />
    </Icon>
  );
}

export function TvShowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 4H4a2 2 0 00-2 2v10a2 2 0 002 2h5v2h6v-2h5a2 2 0 002-2V6a2 2 0 00-2-2zm0 12H4V6h16v10zm-9-8l5 3-5 3V8z" />
    </Icon>
  );
}

export function AnimationIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 100 18 2.5 2.5 0 002.5-2.5c0-.65-.25-1.24-.66-1.68a.5.5 0 01.36-.82H16a5 5 0 005-5c0-4.42-4.03-8-9-8zm0 1c4.41 0 8 3.14 8 7a4 4 0 01-4 4h-1.8a1.5 1.5 0 00-1.09 2.53c.24.26.39.6.39.97A1.5 1.5 0 0112 20a8 8 0 010-16zM6.5 11a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm2-4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm4 2a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </Icon>
  );
}

export function TrendingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 7l3.5 3.5-4.7 4.7-3-3L3 19l.7.7 6.1-6.1 3 3 5.4-5.4L21.5 15V7H14z" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.4 3H4v8.4l8.6 8.6 8.4-8.4L12.4 3zM5 10.98V4h6.98l7.6 7.6-6.98 6.98L5 10.98zM7.5 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm6.9 8h-3.02a14.2 14.2 0 00-1.2-5.2A8.02 8.02 0 0118.9 11zM12 4.04c.8 1.1 1.63 3.1 1.84 6.96h-3.68C10.37 7.14 11.2 5.14 12 4.04zM9.32 5.8a14.2 14.2 0 00-1.2 5.2H5.1a8.02 8.02 0 014.22-5.2zM5.1 13h3.02c.1 1.9.5 3.72 1.2 5.2A8.02 8.02 0 015.1 13zm6.9 5.96c-.8-1.1-1.63-3.1-1.84-6.96h3.68c-.21 3.86-1.04 5.86-1.84 6.96zm2.68-.76c.7-1.48 1.1-3.3 1.2-5.2h3.02a8.02 8.02 0 01-4.22 5.2z" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 1a4 4 0 110 8 4 4 0 010-8zm-.5-6h1v3h-1V2zm0 19h1v3h-1v-3zM2 11.5h3v1H2v-1zm17 0h3v1h-3v-1zM4.4 5.1l.7-.7 2.1 2.1-.7.7-2.1-2.1zm12.4 12.4l.7-.7 2.1 2.1-.7.7-2.1-2.1zm2.8-13.1l.7.7-2.1 2.1-.7-.7 2.1-2.1zM6.5 16.8l.7.7-2.1 2.1-.7-.7 2.1-2.1z" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.3 3a9 9 0 108.7 11.3 7.5 7.5 0 01-8.7-11.3zm-1.6 1.4a8.5 8.5 0 009.1 9.9A8 8 0 1110.7 4.4z" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5v14l11-7L8 5z" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4-4.6-4.6 4.6-4.6z" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.6 7.4L10 6l6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6z" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15.4L6 9.4 7.4 8l4.6 4.6L16.6 8 18 9.4l-6 6z" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4z" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 1a8 8 0 110 16 8 8 0 010-16zm-.5 3v5.3l4.1 2.4.5-.9-3.6-2.1V7h-1z" />
    </Icon>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c-3.9 0-7 1.1-7 2.5v13C5 19.9 8.1 21 12 21s7-1.1 7-2.5v-13C19 4.1 15.9 3 12 3zm0 1c3.6 0 6 1 6 1.5S15.6 7 12 7 6 6 6 5.5 8.4 4 12 4zM6 7.4C7.2 8.1 9.4 8.5 12 8.5s4.8-.4 6-1.1v3.2c0 .5-2.4 1.5-6 1.5s-6-1-6-1.5V7.4zm0 5c1.2.7 3.4 1.1 6 1.1s4.8-.4 6-1.1v3.2c0 .5-2.4 1.5-6 1.5s-6-1-6-1.5v-3.2zm6 7.6c-3.6 0-6-1-6-1.5v-1.1c1.2.7 3.4 1.1 6 1.1s4.8-.4 6-1.1v1.1c0 .5-2.4 1.5-6 1.5z" />
    </Icon>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 3H6v18l6-4.5 6 4.5V3zm-1 1v15l-5-3.75L7 19V4h10z" />
    </Icon>
  );
}

export function BookmarkFilledIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 3H6v18l6-4.5 6 4.5V3z" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 17V8h1v9h-1zm-3 0V8h1v9H8zm7 0V8h1v9h-1zM9 4V3h6v1h5v1h-1.6l-1 15.5H6.6L5.6 5H4V4h5zm.4 15.5h5.2l.95-14.5H8.45l.95 14.5z" />
    </Icon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 00-7.6 4.2V4.5h-1v4.6h4.6v-1H5.4A8 8 0 1112 20v1a9 9 0 000-18zm-.5 4v5.3l4.1 2.4.5-.9-3.6-2.1V7h-1z" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.6 17.6L4 12l1.4-1.4 4.2 4.2 9-9L20 7.2 9.6 17.6z" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4a4 4 0 100 8 4 4 0 000-8zm0 1a3 3 0 110 6 3 3 0 010-6zm0 8c-3.9 0-7 2.1-7 4.7V21h14v-3.3c0-2.6-3.1-4.7-7-4.7zm0 1c3.5 0 6 1.8 6 3.7V20H6v-2.3c0-1.9 2.5-3.7 6-3.7z" />
    </Icon>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18v12H3V6zm1 1v10h16V7H4zm1.5 1.5h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h1.5v2H17v-2zm-11.5 3h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h1.5v2H17v-2zm-11.5 3h11v2h-11v-2z" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a5 5 0 00-5 5v3.6l-1.7 3.4h13.4L17 11.6V8a5 5 0 00-5-5zm0 1a4 4 0 014 4v3.84l1.08 2.16H6.92L8 11.84V8a4 4 0 014-4zm-2 12a2 2 0 004 0h-1a1 1 0 01-2 0h-1z" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </Icon>
  );
}

export function VolumeHighIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 9v6h4l5 4V5L7 9H3zm8-1.8v9.6L7.7 14H4v-4h3.7L11 7.2zM15.5 12a3.5 3.5 0 00-2-3.16v6.32A3.5 3.5 0 0015.5 12zm-2 6.7a7 7 0 000-13.4v1.05a6 6 0 010 11.3v1.05z" />
    </Icon>
  );
}

export function VolumeLowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 9v6h4l5 4V5L7 9H3zm8-1.8v9.6L7.7 14H4v-4h3.7L11 7.2zM15.5 12a3.5 3.5 0 00-2-3.16v6.32A3.5 3.5 0 0015.5 12z" />
    </Icon>
  );
}

export function VolumeMutedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 9v6h4l5 4V5L7 9H3zm8-1.8v9.6L7.7 14H4v-4h3.7L11 7.2zm4.8 1.5l-.7.7 2.1 2.1-2.1 2.1.7.7 2.1-2.1 2.1 2.1.7-.7-2.1-2.1 2.1-2.1-.7-.7-2.1 2.1-2.1-2.1z" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 1a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm-1.3-6.5l-.35 2.4a7.5 7.5 0 00-1.72 1l-2.25-.93-1.3 2.26 1.9 1.5a7.6 7.6 0 000 2l-1.9 1.5 1.3 2.26 2.25-.93c.53.42 1.1.76 1.72 1l.35 2.44h2.6l.35-2.44c.62-.24 1.19-.58 1.72-1l2.25.93 1.3-2.26-1.9-1.5a7.6 7.6 0 000-2l1.9-1.5-1.3-2.26-2.25.93a7.5 7.5 0 00-1.72-1L13.3 3h-2.6zm.87 1h.86l.3 2.08.5.2c.6.23 1.14.54 1.6.93l.4.33 1.95-.8.43.74-1.65 1.3.1.5a6.6 6.6 0 010 1.74l-.1.5 1.65 1.3-.43.75-1.95-.8-.4.32c-.46.4-1 .7-1.6.93l-.5.2-.3 2.08h-.86l-.3-2.08-.5-.2a6.5 6.5 0 01-1.6-.93l-.4-.32-1.95.8-.43-.74 1.65-1.3-.1-.5a6.6 6.6 0 010-1.74l.1-.5-1.65-1.3.43-.75 1.95.8.4-.32c.46-.4 1-.7 1.6-.93l.5-.2.3-2.08z" />
    </Icon>
  );
}

export function FullscreenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9V4h5v1H5v4H4zm11-5h5v5h-1V5h-4V4zM4 15h1v4h4v1H4v-5zm15 0h1v5h-5v-1h4v-4z" />
    </Icon>
  );
}

export function ExitFullscreenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4v4a1 1 0 01-1 1H4V8h4V4h1zm6 0h1v4h4v1h-4a1 1 0 01-1-1V4zM4 15h4a1 1 0 011 1v4H8v-4H4v-1zm12 0h4v1h-4v4h-1v-4a1 1 0 011-1z" />
    </Icon>
  );
}

export function TheaterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7h18v10H3V7zm1 1v8h16V8H4z" />
    </Icon>
  );
}

export function DefaultViewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 6h14v12H5V6zm1 1v10h12V7H6z" />
    </Icon>
  );
}

/**
 * Nut tua lui/tien kem so giay ngay trong icon, giong nut "replay 10" cua YouTube.
 * So giay do nguoi dung chon nen phai ve bang <text> chu khong co san trong path.
 */
function SeekIcon({ seconds, forward, ...props }: IconProps & { seconds: number; forward?: boolean }) {
  return (
    <Icon {...props}>
      <g transform={forward ? "scale(-1,1) translate(-24,0)" : undefined}>
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
      </g>
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        {seconds}
      </text>
    </Icon>
  );
}

export function SeekBackIcon({ seconds, ...props }: IconProps & { seconds: number }) {
  return <SeekIcon seconds={seconds} {...props} />;
}

export function SeekForwardIcon({ seconds, ...props }: IconProps & { seconds: number }) {
  return <SeekIcon seconds={seconds} forward {...props} />;
}

/** Nut phu de, dang khung chu "CC" giong nut phu de cua YouTube. */
export function SubtitleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4V6h16v12zM6.5 11.5h1.6a1 1 0 0 0-1-.9c-.7 0-1.2.6-1.2 1.4s.5 1.4 1.2 1.4c.5 0 .9-.3 1-.8h1.6c-.2 1.3-1.2 2.2-2.6 2.2-1.6 0-2.8-1.2-2.8-2.8S5.5 9.2 7.1 9.2c1.4 0 2.4.9 2.6 2.3H6.5zm7.5 0h1.6a1 1 0 0 0-1-.9c-.7 0-1.2.6-1.2 1.4s.5 1.4 1.2 1.4c.5 0 .9-.3 1-.8h1.6c-.2 1.3-1.2 2.2-2.6 2.2-1.6 0-2.8-1.2-2.8-2.8s1.2-2.8 2.8-2.8c1.4 0 2.4.9 2.6 2.3H14z" />
    </Icon>
  );
}

/**
 * Nut chuyen tap, dang tam giac kem vach dung giong nut tua bai cua trinh phat nhac.
 *
 * Khong dung mui ten chevron: chevron o day de hieu nham thanh "tua nhanh", con vach
 * dung noi ro la nhay han sang muc khac.
 */
export function PreviousEpisodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </Icon>
  );
}

export function NextEpisodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z" />
    </Icon>
  );
}

/** Phat lai: mui ten vong tron nguoc. */
export function ReplayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    </Icon>
  );
}

/** Anh trong anh: khung lon kem mot khung nho nam goc duoi phai. */
export function PictureInPictureIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 3H3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm-1 16H4V5h16v14zm-1-8h-7v6h7v-6z" />
    </Icon>
  );
}

/** Xoay man hinh: khung dien thoai kem mui ten vong quanh. */
export function RotateScreenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 2h5A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 12.5v-9A1.5 1.5 0 0 1 7.5 2zm0 1.5v9h5v-9h-5zM19 14.5A6.5 6.5 0 0 1 12.5 21H11l1.7 1.7-.9.9L9.2 21l2.6-2.6.9.9L11 21h1.5A5 5 0 0 0 17.5 16v-1.5H19v.5zM5 9.5A6.5 6.5 0 0 1 11.5 3H13l-1.7-1.7.9-.9L14.8 3l-2.6 2.6-.9-.9L13 3h-1.5A5 5 0 0 0 6.5 8v1.5H5v-.5z" />
    </Icon>
  );
}
