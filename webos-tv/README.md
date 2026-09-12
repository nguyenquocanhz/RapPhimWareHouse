# RapPhim TV — app webOS (LG Smart TV)

App cho **LG Smart TV (webOS)**. LG **không** chạy được APK Android, nên đây là app web
đóng gói `.ipk` — mở thẳng frontend RapPhim đang chạy trong mạng nhà (`:7100`), có icon
riêng trên màn hình chính LG.

> Khác với [`../mobile-tv`](../mobile-tv) (app **Android TV**, file `.apk`). LG dùng
> webOS nên cần bản `.ipk` riêng này.

## Nội dung

```
app/
  appinfo.json    Manifest webOS (id, tên, icon, kiểu "web")
  index.html      Trang vỏ: hiện splash RapPhim rồi mở http://192.168.100.169:7100
  icon.png        Icon 80x80
  largeIcon.png   Icon 130x130
com.rapphim.tv_1.0.0_all.ipk   Gói đã đóng, sẵn sàng cài
```

Đổi máy chủ: sửa `APP_URL` trong `app/index.html` rồi đóng gói lại.

## Cách cài lên LG TV (sideload qua Developer Mode)

### 1. Trên TV — bật Developer Mode
1. Tạo tài khoản LG miễn phí: <https://developer.lge.com>.
2. **LG Content Store** → tìm & cài app **"Developer Mode"**.
3. Mở app đó → đăng nhập tài khoản LG → bật **Dev Mode** (TV khởi động lại).
4. Mở lại app Developer Mode → ghi lại **IP address** và **Passphrase** (mã 6 ký tự).
   Bật luôn **"Key Server"** nếu có.

### 2. Trên máy tính — đóng gói & cài
```bash
# Cài công cụ (một lần)
npm i -g @webosose/ares-cli

# Đăng ký TV (thay IP; cổng mặc định 9922)
ares-setup-device --add lgtv --info "host=192.168.100.xxx port=9922 username=prisoner"

# Lấy khóa dev (nhập Passphrase hiện trên TV)
ares-novacom --device lgtv --getkey

# Đóng gói (nếu sửa app) rồi cài
ares-package app -o .
ares-install --device lgtv com.rapphim.tv_1.0.0_all.ipk

# Chạy thử
ares-launch --device lgtv com.rapphim.tv
```

App sẽ hiện icon **RapPhim TV** trong danh sách ứng dụng của LG. Mở lên là vào kho phim.

> Dev Mode của LG hết hạn sau ~50 giờ dùng (gia hạn trong chính app Developer Mode).
> Đây là giới hạn của LG cho app sideload, không phải của RapPhim.

## Điều khiển

LG **Magic Remote** có con trỏ (như chuột) nên duyệt web RapPhim mượt. Nút mũi tên
+ OK cũng dùng được. Muốn tối ưu hẳn cho remote (D-pad) thì cần chỉnh riêng UI web —
bản vỏ này ưu tiên "cài được ngay, có icon".
