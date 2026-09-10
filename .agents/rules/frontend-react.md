---
trigger: glob
globs: frontend/**/*.tsx,frontend/**/*.ts
description: Luật cho code Next.js / React của RapPhim — chỉ áp dụng khi chạm file frontend
---

# Luật frontend (React / Next.js 16)

Chi tiết của hiến pháp gốc `AGENTS.md`, chỉ nạp khi agent chạm file `.ts`/`.tsx`.

## React Compiler đang TẮT — memo hoá bằng tay là bắt buộc

`next.config` không bật React Compiler. Nghĩa là **không** có tự động memo hoá.

- Object/array/hàm truyền vào `useEffect`, `useMemo`, hook tuỳ biến, hoặc props của
  component con **phải** được `useMemo`/`useCallback`. Dựng literal mới mỗi render sẽ
  làm effect refire và có thể khoá hành vi.
- Bằng chứng sống: `usePlayer.ts` từng khoá playback vì object `controls` bị dựng lại
  mỗi render → effect `seekRequest` refire trên mỗi `timeupdate`. Sửa bằng `useMemo`.
- Lint `react-hooks/immutability`, `react-hooks/set-state-in-effect`,
  `react-hooks/preserve-manual-memoization` **bắt đúng** loại lỗi này — đừng tắt, hãy
  nghe nó.

## Web Audio làm câm nguồn cross-origin

`createMediaElementSource` **câm** mọi nguồn khác gốc (CORS). Chỉ nối chuỗi audio
(Boost/EQ) khi source là `blob:` **cùng gốc**. Guard bằng `sameOrigin()` trong
`useAudioChain` trước khi tạo graph. Một graph chỉ tạo được **một lần** cho mỗi
element → dùng `WeakMap` keyed theo video element.

## Trình duyệt không gọi thẳng backend

Mọi lời gọi API đi qua **route handler cùng gốc** dưới `src/app/api/*` (proxy). Lý do:
tránh CORS, và tránh nhét địa chỉ backend vào `.next/static`.

- **`NEXT_PUBLIC_*` bị cố định lúc `next build`** — không phải biến lúc chạy. Đừng đưa
  địa chỉ LAN/backend vào biến này; dùng đường tương đối, để route handler chuyển tiếp.
- Địa chỉ backend cho phần máy chủ đọc từ `API_INTERNAL_URL` **lúc chạy**.

## Quy ước

- Function component + hooks, không class. Prop có kiểu tường minh, tránh `any`.
- Chuỗi hiển thị cho người dùng: tiếng Việt **đủ dấu**. Comment: tiếng Việt **không dấu**.
- Tham chiếu code bằng `file:dòng`.
