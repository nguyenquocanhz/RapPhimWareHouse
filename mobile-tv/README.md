# RapPhim TV

Ứng dụng **Android TV** riêng cho RapPhim WareHouse — giao diện "10-foot" (điều khiển
bằng remote/D-pad, xem từ xa), khác với app điện thoại ở thư mục [`../mobile`](../mobile).

Đây là **client mỏng**: chỉ gọi REST API của backend có sẵn (`/api/v1`), không nhúng
dữ liệu, không đổi gì trên máy chủ. Dùng chung thư viện `src/lib` (config, api, settings,
theme) với app điện thoại.

## Vì sao làm app TV riêng?

App điện thoại chạy được trên Android TV nhưng bị khóa dọc (letterbox) và không có
điểm focus rõ. App này thiết kế lại cho tivi:

| Yếu tố | App điện thoại | App TV |
| --- | --- | --- |
| Hướng màn hình | Dọc (portrait) | Ngang (landscape) |
| Điều khiển | Chạm | Remote / D-pad |
| Ô đang chọn | Không cần | **Phóng to + viền đỏ rõ** |
| Trình phát | WebView | `expo-video` (ExoPlayer) — remote điều khiển được, WebView chỉ dùng cho nguồn nhúng |
| Launcher | Màn hình chính | **Leanback** (hàng ứng dụng của Android TV) |

## Nền tảng

- Expo SDK 57, expo-router (giống app điện thoại — cùng bộ native module first-party
  nên build ổn định).
- `react-native` được trỏ (alias) sang **`react-native-tvos@0.86.2-0`** — bản fork
  của React Native 0.86 có thêm `Platform.isTV`, `TVFocusGuideView`, sự kiện remote.
- **`@react-native-tvos/config-tv`** (config plugin): tự sinh manifest leanback
  (`uses-feature` leanback, `LEANBACK_LAUNCHER`, banner 320×180) khi prebuild với
  biến môi trường `EXPO_TV=1`.
- **`expo-video`**: trình phát native ExoPlayer, phát được HLS (`.m3u8`) và file trực
  tiếp; thanh điều khiển đi được bằng D-pad.

## Cài đặt & chạy

```bash
cd mobile-tv
npm install --legacy-peer-deps          # alias tvos cần cờ này

# Sinh dự án Android cho tivi (bắt buộc EXPO_TV=1)
EXPO_TV=1 npx expo prebuild -p android --clean

# Cắm tivi / máy ảo Android TV rồi build + cài
EXPO_TV=1 npx expo run:android
```

> **Lưu ý:** phải có `EXPO_TV=1` mọi lệnh prebuild/run, nếu không config-tv sẽ dựng
> bản điện thoại thường (không có leanback).

### Máy ảo Android TV để thử

```bash
sdkmanager "system-images;android-36;android-tv;x86_64"
avdmanager create avd -n rapphim_tv -k "system-images;android-36;android-tv;x86_64" -d tv_1080p
emulator -avd rapphim_tv
```

Điều hướng bằng D-pad qua adb khi không có remote:

```bash
adb shell input keyevent 20   # xuống
adb shell input keyevent 22   # phải
adb shell input keyevent 23   # OK/chọn
adb shell input keyevent 4    # quay lại
```

## Bản độc lập (STANDALONE) + Premium

App có 2 chế độ, đặt bằng `STANDALONE` trong `src/lib/config.ts`:

- **`STANDALONE = true`** (mặc định bản phát hành): **không cần backend riêng**. App gọi
  thẳng **KKPhim (phimapi.com)** cho phim và **iptv-org** cho truyền hình. Ai cài cũng
  dùng được ngay. Nguồn phim ở [`src/lib/kkphim.ts`](src/lib/kkphim.ts).
- **`STANDALONE = false`**: client mỏng của backend RapPhim trong mạng nhà.

### Free / Premium (thu phí offline, không cần máy chủ)

Chia tính năng để tác giả thu phí duy trì. Cơ chế **cấp phép offline**: mã kích hoạt
được **ký bằng khoá bí mật Ed25519** của tác giả; app chỉ **chứng thực chữ ký** bằng
khoá công khai nhúng sẵn (`PREMIUM_PUBLIC_KEY`) — nên **không cần server** để kiểm tra,
và mã không thể giả mạo. Xem [`src/lib/premium.ts`](src/lib/premium.ts).

- Tính năng Premium hiện tại: **Truyền hình trực tiếp** (đặt trong `PREMIUM_FEATURES`).
- Người dùng nhập mã ở màn **Premium**; app lưu bằng AsyncStorage.

**Tác giả cấp mã** (giữ khoá bí mật `tools/author-secret.txt` — đã gitignore):
```bash
node tools/gen-license.js "Tên khách"        # mã vĩnh viễn
node tools/gen-license.js "Tên khách" 365     # mã hết hạn sau 365 ngày
```
Đổi cặp khoá: tạo khoá mới bằng `node -e "..nacl.sign.keyPair().."`, dán public vào
`config.ts`, cất private vào `tools/author-secret.txt`.

> Lưu ý: KKPhim là nguồn tổng hợp của bên thứ ba — cân nhắc yếu tố bản quyền khi thu phí.

## Cấu hình máy chủ (chỉ khi STANDALONE = false)

Vào **Cài đặt** (nút trên trang chủ) để đổi IP/cổng backend. Mặc định
`192.168.100.169:7101` (API) và `:7100` (web, phục vụ ảnh). Lưu lại bằng
AsyncStorage, đổi là có hiệu lực ngay, không cần build lại.

## Cấu trúc

## Giao diện kiểu YouTube TV

Trang chủ theo đúng mẫu YouTube trên Android TV:
- **Thanh điều hướng dọc bên trái** (`SideNav`): thu gọn chỉ còn icon, khi bấm sang
  trái (focus vào nó) thì **bung rộng kèm nhãn** — Tìm kiếm · Trang chủ · Truyền hình ·
  Cài đặt. Bấm sang phải quay lại nội dung, thanh tự thu gọn.
- **Nội dung là các "kệ" cuộn dọc**, mỗi kệ là một hàng phim cuộn ngang.
- Ô đang chọn phóng to + viền đỏ; focus ban đầu nằm ở nội dung (thanh nav thu gọn).

```
src/
  app/
    _layout.tsx         Stack gốc, nạp cài đặt backend trước khi vẽ
    index.tsx           Trang chủ: SideNav trái + chip nguồn + các kệ phim
    movie/[slug].tsx    Chi tiết phim + lưới tập + nút Xem
    watch.tsx           Trình phát: expo-video (m3u8) hoặc WebView (nhúng)
    search.tsx          Tìm kiếm + lưới kết quả
    settings.tsx        Đổi địa chỉ backend
    tv.tsx              Truyền hình trực tiếp (kênh VN từ iptv-org)
  components/
    SideNav.tsx         Thanh điều hướng trái kiểu YouTube (thu gọn/bung theo focus)
    Focusable.tsx       Bọc Pressable, cho style/children đổi theo focus
    BackButton.tsx      Nút "Quay lại" hiện rõ (cho cả chuột lẫn remote)
    PosterCard.tsx      Thẻ phim dọc, phóng to + viền đỏ khi được chọn
    ChannelCard.tsx     Ô kênh truyền hình (logo + tên)
    Row.tsx             Kệ phim cuộn ngang, tự nạp, ẩn nếu rỗng/lỗi
  lib/                  Dùng chung với app điện thoại (config/api/settings/theme)
    iptv.ts             Tải + phân tích playlist iptv-org (kênh VN)
```

## Truyền hình trực tiếp

Kênh VN lấy từ [iptv-org](https://iptv-org.github.io/) (playlist công khai, hợp pháp).
App tải thẳng `countries/vn.m3u`, phân tích M3U rồi phát bằng trình phát HLS native.
Một số kênh gắn `[Geo-blocked]` — chỉ xem được khi ở trong nước.

## Điểm cần biết

- **Focus phải nhìn thấy.** Mọi phần tử bấm được bọc trong `Focusable`; lúc được chọn
  sẽ phóng to nhẹ + viền đỏ thương hiệu. Đây là điều tối kỵ nếu thiếu trên tivi.
- **Cleartext HTTP** được bật (`expo-build-properties`) vì backend trong LAN chạy HTTP.
- **Nguồn nhúng (embed).** Một số nguồn chỉ có trang nhúng, không có `.m3u8`. Những
  tập đó rơi về WebView — điều khiển bằng remote sẽ kém hơn native. Nguồn có `m3u8`
  (gồm kho riêng ZCloud) phát bằng ExoPlayer.
