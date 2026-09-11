# RapPhim — App Android (React Native / Expo)

Ứng dụng Android **client mỏng** cho RapPhim: chỉ gọi REST API của backend có sẵn, không
nhúng dữ liệu, nên gọn nhẹ. Giao diện kiểu YouTube (tối, đỏ RapPhim).

## Có gì

- **Trang chủ**: chọn nguồn (KKPhim / NguonC / VSMOV / Kho riêng) + lọc theo loại (Phim bộ,
  Phim lẻ, Hoạt hình…), cuộn vô tận, kéo làm mới.
- **Tìm kiếm** phim.
- **Chi tiết phim**: poster, mô tả, thể loại, danh sách tập.
- **Xem phim**: mở trang phát của web trong WebView — tận dụng nguyên bộ player web
  (HLS, phụ đề, thuyết minh) thay vì viết lại native.
- Tab **Shorts / Kênh / Thư viện** (Kênh liệt kê nguồn; Shorts/Thư viện là chỗ dành sẵn).

## Chạy thử

Cần **Node 20+**. Máy/điện thoại chạy app phải **cùng mạng LAN** với backend homelab.

```bash
cd mobile
npm install
npx expo start
```

Quét mã QR bằng **Expo Go** (Android), hoặc bấm `a` để mở trên emulator Android.

## Trỏ tới backend

Mặc định app gọi `http://192.168.100.169:7101` (API) và `:7100` (web, cho ảnh poster kho
riêng). Đổi bằng biến môi trường khi chạy, không cần sửa code:

```bash
EXPO_PUBLIC_HOST=192.168.1.50 npx expo start
```

Hoặc đặt riêng: `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_WEB_BASE`. Xem `src/lib/config.ts`.

## Đóng gói APK

```bash
npx eas build -p android --profile preview
```

Lưu ý cho bản release: backend đang chạy **HTTP** (không HTTPS) trong LAN, mà Android chặn
cleartext HTTP ở bản release. Thêm plugin `expo-build-properties` với
`android.usesCleartextTraffic: true`, hoặc đặt backend sau HTTPS.

## Cấu trúc

```
src/
  lib/        config.ts (địa chỉ backend) · api.ts (client + kiểu) · theme.ts (màu)
  components/ MovieCard.tsx
  app/        _layout.tsx (Stack) · search.tsx · watch.tsx (player WebView)
    (tabs)/   index.tsx (Trang chủ) · shorts · subscriptions (Kênh) · library (Thư viện)
    movie/    [slug].tsx (chi tiết)
```

API dùng: `GET /api/v1/movies/latest`, `/movies` (theo loại), `/movies/search`,
`/movies/{slug}`, `/providers`.
