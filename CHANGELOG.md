# Changelog

Ghi lại các thay đổi đáng chú ý của RapPhim WareHouse.

Theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/). Mỗi mục ghi kèm số PR
(`#NN`) để tra ngược. Dự án chưa gắn thẻ phiên bản nên nhóm theo mốc thời gian.

## [Chưa phát hành]

### Thêm
- **App Android (React Native / Expo)** ở `mobile/` — client mỏng, chỉ gọi REST API
  sẵn có nên gọn nhẹ. Giao diện kiểu YouTube (tối, đỏ RapPhim): Trang chủ (chip chọn
  nguồn + lọc loại, cuộn vô tận), Tìm kiếm, Chi tiết phim, Xem phim (WebView tận dụng
  player web), tab Shorts/Kênh/Thư viện. (#26)
- **Màn Cài đặt địa chỉ backend** trong app Android — đổi IP/cổng ngay trong app, lưu
  bền qua AsyncStorage, có "Kiểm tra kết nối". (#26)
- **CI build iOS** trên GitHub Actions (macOS runner) — xuất `.ipa` chưa ký để sideload
  bằng Apple ID miễn phí (`.github/workflows/ios-build.yml`). (#26)
- **Thumbnail cho video kho riêng (ZCloud)** — backend bắt một khung hình qua ffmpeg,
  cache ra đĩa, giới hạn số tiến trình; endpoint `/api/v1/homelab/thumbnail`. (#25)
- **Hiển thị file phẳng thành phim lẻ** cho nguồn homelab — file video nằm thẳng dưới
  prefix thành phim lẻ; thư mục con: 1 file là phim lẻ, nhiều file là phim bộ. (#25)
- **Bộ tài liệu hướng dẫn** ở `docs/huong-dan/` (00–07 + mục lục) theo phong cách KB
  123host, kèm bộ dựng Markdown → PDF.

### Sửa
- **Nguồn homelab (ZCloud) và AniList không gọi được** — `providerRequestFactory` dùng
  `detect()` chọn factory JDK, gửi thân POST bằng chunked không kèm `Content-Length`
  nên uvicorn/FastAPI của ZCloud (và GraphQL AniList) đọc thành rỗng. Chuyển sang Apache
  HttpClient5. (#25)
- App Android bản release chặn HTTP LAN — thêm `expo-build-properties` với
  `usesCleartextTraffic=true`. (#26)

## 2026-09 — Nền tảng

### Thêm
- **Thuyết minh tự động**: OCR phụ đề cháy → dịch → TTS, tích hợp player. (#22)
- **Danh sách diễn viên** dưới phim, bấm tìm phim theo diễn viên. (#21, #14)
- **Tự chuyển tập (autoplay)** khi sang tập mới. (#19)
- **Nguồn phim VSMOV** (vsmov.com) và cho phép host ảnh để hiện thumbnail. (#16, #18)
- **Giao diện trình phát kiểu YouTube mới.** (#17)
- **Gợi ý tìm kiếm** chia thể loại + phim, giống YouTube. (#13)
- Nguồn chỉ-embed: mở tab mới khi bị chặn nhúng. (#15)
- **Metadata anime**: AniList (chính) + Jikan (dự phòng). (#11)
- **CoreDNS DNS-over-TLS** để vượt chặn/đầu độc DNS của ISP.
- **CMS quản trị**: bật/tắt nguồn và đặt khoá ngay trên giao diện.

### Sửa
- **vsmov 502**: chịu được `poster_url`/`thumb_url` là `{}` (object rỗng) + thử lại lỗi
  mạng chớp nhoáng; tắt dịch vụ thuyết minh (dub) cho nhẹ homelab. (#23)
- **Phát mượt hơn**: bật worker cho hls.js + giảm render thừa. (#20)
- **Chuỗi lỗi TMDB**: chỉ đúng nội dung thật sự hỏng. (#2)

### Hạ tầng & tài liệu
- Ảnh Docker chạy cả **arm64** lẫn amd64; nền JRE arm64. (#3, #4)
- Chặn RAM các container ở bản prod. (#7)
- Không dựng lại ảnh Docker khi chỉ sửa tài liệu. (#6)
- **Sổ tay sự cố DevOps** + "văn khấn deploy" trong `docs/ebook/`. (#5, #10)
- **AGENTS.md** (hiến pháp cho agent) + tách luật vào `.agents/rules` theo glob. (#8, #9)
