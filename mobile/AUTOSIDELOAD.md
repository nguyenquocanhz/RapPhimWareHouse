# AutoSideload — cài & tự gia hạn RapPhim trên iPhone (miễn phí)

iOS bản build là `.ipa` **chưa ký**; muốn cài lên iPhone thì "sideload" bằng **Apple ID
miễn phí** (cơ chế phát triển cá nhân chính thức của Apple). Nhược điểm: app hết hạn sau
**7 ngày**. `AutoSideload.ps1` lo phần lặp đi lặp lại để bạn khỏi làm tay.

> **Ranh giới:** script **không** cầm mật khẩu Apple ID của bạn. Việc ký app do
> AltStore/Sideloadly tự xử lý trong giao diện bảo mật của nó — bạn nhập Apple ID một lần
> ở đó. Script chỉ: tải `.ipa` mới nhất + mở công cụ + giữ AltServer chạy nền để tự gia hạn.

## Chuẩn bị (một lần)
1. Cài **iTunes** + **iCloud** bản từ **apple.com** (không phải Microsoft Store) — để có driver USB.
2. Cài **AltStore/AltServer** (khuyên dùng, có tự gia hạn nền): <https://altstore.io>
   — hoặc **Sideloadly**: <https://sideloadly.io>

## Dùng
```powershell
# Tải .ipa mới nhất từ Release + mở công cụ sideload:
powershell -ExecutionPolicy Bypass -File AutoSideload.ps1

# Kèm bật tự-gia-hạn nền (tạo Scheduled Task chạy AltServer lúc đăng nhập):
powershell -ExecutionPolicy Bypass -File AutoSideload.ps1 -SetupAutoRefresh
```
- Script tải bản `.ipa` mới nhất từ GitHub Release về `%USERPROFILE%\RapPhim\`.
- Mở AltStore/Sideloadly → bạn nhập **Apple ID miễn phí** (trong app đó) → cài.
- iPhone: **Cài đặt → Chung → VPN & Quản lý thiết bị** → tin cậy Apple ID.

## Tự gia hạn (khỏi ký tay mỗi 7 ngày)
- Chạy với `-SetupAutoRefresh`: AltServer chạy nền, **máy bật + iPhone cùng WiFi** thì app
  tự ký lại trước khi hết hạn.
- Hoặc dùng **SideStore** (AltStore chạy ngay trên iPhone) — tự gia hạn qua WiFi, **không
  cần bật PC**.

## Có bản mới thì sao?
Mỗi lần Release ra bản `.ipa` mới, chạy lại `AutoSideload.ps1` là nó tải bản mới nhất rồi cài đè.
