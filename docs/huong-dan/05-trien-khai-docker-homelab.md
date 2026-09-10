# Hướng dẫn triển khai bằng Docker (homelab)

> Tài liệu: Triển khai RapPhim WareHouse bằng Docker trên homelab
> Phiên bản: 1.0
> Cập nhật: 2026-09-11
> Đối tượng đọc: DevOps / người vận hành homelab
> Trạng thái: Chính thức
> Tag: docker, docker-compose, homelab, coredns, deploy, ssh

## Giới thiệu

Tài liệu này hướng dẫn triển khai toàn bộ RapPhim WareHouse lên một máy chủ homelab bằng Docker Compose. Sau khi làm theo, chúng ta sẽ có ba container chạy song song: một bộ phân giải tên miền riêng (CoreDNS), một backend Spring Boot, và một frontend Next.js, tất cả nằm trong cùng một mạng Docker riêng.

Tại sao lại cần một quy trình riêng cho homelab thay vì chỉ `docker compose up`? Có hai lý do thực tế mà repo đã gặp phải và đã xử lý sẵn:

- **Xung đột cổng.** Cổng `8080` trên máy homelab đã có dịch vụ khác (ZCloud) dùng, nên chúng ta đưa backend ra ngoài ở cổng `7101` và web ở cổng `7100`. Bên trong mạng Docker, hai dịch vụ vẫn nghe `8080` và `3000` như bình thường.
- **DNS của ISP bị can thiệp.** Trên mạng của máy này, một số tên miền (ví dụ `api.themoviedb.org`) bị chèn phản hồi DNS giả trả về `127.0.0.1`. Lỗi hiện ra là "I/O error", trông như backend hỏng, nhưng thực chất là không bao giờ kết nối tới nơi. Vì vậy chúng ta chạy một bộ phân giải CoreDNS dùng DNS-over-TLS để đi trong đường mã hoá.

Máy đích không cài `rsync`, nên việc đưa mã nguồn lên được thực hiện qua `tar` truyền qua SSH bằng script `deploy.sh`. Tài liệu sẽ đi qua cả hai cách: chạy tại chỗ và triển khai từ xa.

## Các thành phần chính

Toàn bộ ngăn xếp được mô tả trong `docker-compose.yml` (bản build từ mã nguồn) và `docker-compose.prod.yml` (bản chạy từ ảnh dựng sẵn).

| Dịch vụ | Ảnh / build | Container | Cổng ra ngoài | Cổng nội bộ | Vai trò |
|---|---|---|---|---|---|
| `dns` | `coredns/coredns:1.14.7` | `rapphim-dns` | (không) | `53` | Bộ phân giải DNS-over-TLS riêng, IP tĩnh `172.29.0.53` |
| `backend` | build `./backend` | `rapphim-backend` | `7101` | `8080` | REST API tổng hợp, chuẩn hoá dữ liệu, cache Caffeine |
| `web` | build `./frontend` | `rapphim-web` | `7100` | `3000` | Giao diện Next.js, gọi backend qua route handler nội bộ |

Các đặc điểm mạng đáng lưu ý:

| Thuộc tính | Giá trị | Vì sao |
|---|---|---|
| Mạng | `rapphim` (driver `bridge`) | Mạng riêng cho ba container |
| Dải mạng | `172.29.0.0/16` | Các dải `172.17`–`172.23` trên máy đã có dự án khác dùng |
| IP cố định của DNS | `172.29.0.53` | Backend cần một địa chỉ tĩnh để trỏ DNS |
| Volume dữ liệu | `rapphim-data` gắn vào `/app/data` | Giữ nguồn tự thêm qua các lần dựng lại container |

Backend còn được khai báo `extra_hosts` là `host.docker.internal:host-gateway` để gọi ngược về ZCloud đang chạy trên chính máy chủ (không nằm trong Docker).

## Chuẩn bị tệp `.env`

Mọi giá trị thay đổi theo máy đều nằm trong một tệp `.env` đặt cạnh `docker-compose.yml`. Chép từ mẫu rồi điền:

```bash
cp .env.example .env
```

Các biến trong `.env.example` và ý nghĩa:

| Biến | Mặc định | Mô tả |
|---|---|---|
| `WEB_PORT` | `7100` | Cổng web đưa ra ngoài |
| `BACKEND_PORT` | `7101` | Cổng backend đưa ra ngoài |
| `PUBLIC_WEB_URL` | `http://192.168.100.169:7100` | Địa chỉ web nhìn từ trình duyệt; chỉ dùng để mở CORS cho ai gọi thẳng API |
| `ZCLOUD_API_KEY` | (trống) | Khoá gọi kho phim riêng ZCloud, gửi qua header `x-api-key` (ưu tiên) |
| `ZCLOUD_PASSWORD` | (trống) | Mật khẩu ZCloud, dùng khi chưa tạo khoá |
| `ZCLOUD_PREFIX` | (trống) | Tiền tố đường dẫn trong kho ZCloud |
| `ZCLOUD_BASE_URL` | `http://host.docker.internal:8080` | Địa chỉ ZCloud; nó chạy trên máy chủ, không phải trong Docker |
| `ADMIN_TOKEN` | (trống) | Khoá để thêm/sửa nguồn phim tại `/quan-tri`; để trống thì trang đó chỉ xem được |
| `TMDB_ACCESS_TOKEN` | (trống) | Token đọc TMDB v4 (ưu tiên); thiếu thì các endpoint TMDB trả `503` |
| `TMDB_API_KEY` | (trống) | Khoá API TMDB v3 |
| `BACKEND_MEM_LIMIT` | `1g` | Giới hạn RAM backend (chỉ dùng ở bản prod) |
| `JAVA_OPTS` | `-Xmx640m` | Tuỳ chọn JVM (chỉ dùng ở bản prod) |
| `WEB_MEM_LIMIT` | `512m` | Giới hạn RAM web (chỉ dùng ở bản prod) |

Lưu ý an toàn: đừng đặt khoá ZCloud hay `ADMIN_TOKEN` vào tệp có ý định chia sẻ. `ADMIN_TOKEN` nên là một chuỗi dài và ngẫu nhiên, vì ai có nó là đổi được nơi lấy phim của cả hệ thống. Nếu để trống các khoá ZCloud thì nguồn homelab tự tắt, phần còn lại của hệ thống vẫn chạy.

## Build và chạy tại chỗ

Khi mã nguồn đã có sẵn trên máy đích (ví dụ sau khi `deploy.sh` gửi lên), chúng ta build ảnh và khởi động bằng một lệnh:

```bash
docker compose up -d --build
```

Lệnh này đọc `docker-compose.yml`, build ảnh `rapphim-backend:latest` từ `backend/Dockerfile` và `rapphim-web:latest` từ `frontend/Dockerfile`, kéo ảnh CoreDNS, rồi khởi động cả ba dịch vụ ở chế độ nền. Lần đầu sẽ mất vài phút vì phải tải phụ thuộc Maven và npm.

Backend dùng ảnh nhiều tầng: tầng build là `maven:3.9-eclipse-temurin-17`, tầng chạy là `bellsoft/liberica-openjre-alpine:17` (giữ nền Alpine vì busybox có sẵn `wget` cho HEALTHCHECK, và bản này có cả `arm64`). Frontend build theo dạng `standalone` của Next.js rồi chạy bằng `node server.js`.

Kiểm tra các container đang chạy:

```bash
docker compose ps
```

Kết quả (tên container là cố định theo cấu hình):

```
NAME               IMAGE                    STATUS
rapphim-dns        coredns/coredns:1.14.7   Up
rapphim-backend    rapphim-backend:latest   Up
rapphim-web        rapphim-web:latest       Up
```

### Bản chạy từ ảnh dựng sẵn (prod override)

`docker-compose.prod.yml` là một tệp compose độc lập (không phải file phủ chồng lên bản gốc), dùng khi không muốn build tại chỗ. Khác biệt chính so với `docker-compose.yml`:

- Backend và web dùng ảnh có sẵn `ghcr.io/nguyenquocanhz/rapphim-backend:${TAG:-latest}` và `ghcr.io/nguyenquocanhz/rapphim-web:${TAG:-latest}` thay vì build.
- Mỗi container có `mem_limit`: backend `1g`, web `512m`, dns `64m`. Đặt `mem_limit` cho backend vừa ghim trần heap JVM (ảnh đặt `MaxRAMPercentage=75` sẽ đọc RAM cả host nếu không giới hạn), vừa để OOM-killer của kernel chỉ giết riêng container này thay vì chọn nạn nhân toàn máy.

Cách chạy bản này (không cần mã nguồn):

```bash
curl -O https://raw.githubusercontent.com/nguyenquocanhz/RapPhimWareHouse/main/docker-compose.prod.yml
curl -o .env https://raw.githubusercontent.com/nguyenquocanhz/RapPhimWareHouse/main/.env.example
docker compose -f docker-compose.prod.yml up -d
```

Ảnh không nhúng địa chỉ nào bên trong nên chạy được ở bất kỳ máy nào; đổi cổng thì chỉ cần sửa `WEB_PORT` / `BACKEND_PORT` trong `.env`.

## Triển khai từ xa bằng `deploy.sh`

Trên máy phát triển, `deploy.sh` đóng gói mã nguồn, gửi qua SSH tới máy homelab rồi dựng lại bằng Docker Compose. Máy đích không cần cài `rsync`; chỉ cần có `tar` ở cả hai đầu.

Chạy toàn bộ quy trình (gửi mã nguồn, build lại, khởi động):

```bash
./deploy.sh
```

Các chế độ khác:

```bash
./deploy.sh --no-build   # chi gui ma nguon roi khoi dong lai, khong build
./deploy.sh --logs       # xem log dang chay roi thoat
./deploy.sh --help       # in phan huong dan o dau tep
```

### Các biến cấu hình của script

Có thể ghi đè bằng biến môi trường khi gọi script:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `SSH_HOST` | `nqatech@192.168.100.169` | Tài khoản và địa chỉ máy đích |
| `SSH_KEY` | `$HOME/.ssh/acer-nitro` | Khoá SSH dùng để đăng nhập |
| `REMOTE_DIR` | `rapphim` | Thư mục đích trong `$HOME` của máy chủ |

### Các bước script thực hiện

1. **Kiểm tra kết nối.** Chạy `docker compose version` qua SSH (`BatchMode=yes`) để chắc máy đích vào được và đã có Docker Compose. Không được thì dừng và báo khoá đang dùng.
2. **Xoá mã nguồn cũ.** Xoá các thư mục `backend frontend docs dub` trên máy đích trước khi gửi bản mới. Việc này cần thiết vì giải nén `tar` chỉ ghi đè tệp đang có, không xoá tệp đã bị xoá ở bản mới — nếu không xoá trước, tệp cũ vẫn còn và vẫn build vào ảnh. Tệp `.env` của người dùng nằm ở gốc nên được giữ nguyên.
3. **Gửi mã nguồn.** Đóng gói bằng `tar czf` rồi bung ra ở máy đích, loại các thư mục sinh khi build và tệp riêng:

   ```bash
   tar czf - -C "$HERE" \
     --exclude=node_modules --exclude=target --exclude=.next --exclude=.git \
     --exclude='*.log' --exclude=.env --exclude=__pycache__ \
     --exclude=ttsenv --exclude=_media \
     backend frontend docs dub README.md \
     docker-compose.yml docker-compose.prod.yml Corefile .env.example \
     | ssh_run "mkdir -p ~/$REMOTE_DIR && tar xzf - -C ~/$REMOTE_DIR"
   ```

   Đáng chú ý: `.env` bị loại khỏi gói (máy đích tự giữ tệp này, ghi đè lên là mất khoá).
4. **Tạo `.env` lần đầu.** Nếu máy đích chưa có `.env`, script chép từ `.env.example` để `compose` không hỏng, kèm nhắc "nhớ điền khoá ZCloud".
5. **Dựng lại.** Với chế độ mặc định chạy `docker compose up -d --build`; với `--no-build` chỉ chạy `docker compose up -d`.
6. **Chờ và kiểm tra.** Lặp tối đa 30 lần, mỗi lần cách 3 giây (tổng 90 giây), gọi `GET /actuator/health` của backend và `GET /` của web. Nếu cả hai trả về được thì báo `Xong` kèm địa chỉ web; nếu quá 90 giây vẫn chưa trả lời thì thoát với mã lỗi và gợi ý xem log.

Địa chỉ để kiểm tra được suy ra từ `SSH_HOST` và các cổng đọc từ `.env` (`WEB_PORT`, `BACKEND_PORT`), mặc định `http://<host>:7100` cho web và `http://<host>:7101` cho API.

## CoreDNS: bộ phân giải tên miền riêng

Container `dns` chạy CoreDNS với cấu hình trong `Corefile`. Vai trò của nó là giải mã tên miền qua DNS-over-TLS để tránh việc DNS thường bị chèn phản hồi giả.

```corefile
.:53 {
    forward . tls://8.8.8.8 tls://8.8.4.4 {
        tls_servername dns.google
    }
    cache 300
    errors
}
```

- `forward . tls://...`: chuyển mọi truy vấn qua kênh TLS tới Google DNS, `tls_servername dns.google` để xác thực chứng chỉ.
- `cache 300`: đệm 300 giây, đỡ phải mở kết nối TLS mới mỗi lần hỏi.

Backend được cấu hình trỏ thẳng vào bộ phân giải này bằng địa chỉ IP tĩnh. Trong `docker-compose.yml`, dịch vụ `backend` khai báo:

```yaml
dns:
  - 172.29.0.53
depends_on:
  - dns
```

Phải ghi bằng địa chỉ IP chứ không dùng tên dịch vụ `dns`, vì Docker không nhận tên dịch vụ ở mục `dns:` của container. Đây cũng là lý do mạng `rapphim` được cố định dải `172.29.0.0/16` và gán IP tĩnh `172.29.0.53` cho container `dns` — để backend luôn tìm thấy đúng địa chỉ đó qua các lần dựng lại.

## Health-check, xem log, cập nhật, rollback

### Kiểm tra sức khoẻ

Cả hai ảnh đều có `HEALTHCHECK` nội bộ: backend gọi `wget` tới `/actuator/health`, web gọi tới `/`. Kiểm tra thủ công từ ngoài:

```bash
curl -fsS http://192.168.100.169:7101/actuator/health
```

Kết quả khi backend khoẻ:

```json
{"status":"UP"}
```

Cấu hình actuator (`application.yml`) mở các endpoint `health,info,caches,metrics` và đặt `show-details: always`, nên `/actuator/health` còn kèm chi tiết từng thành phần. Web trả về mã `200` ở đường dẫn gốc là đủ để coi là sẵn sàng.

### Xem log

```bash
# Tren may dat: theo doi log ca ba dich vu
docker compose logs --tail 60 -f

# Chi mot dich vu
docker compose logs -f backend

# Tu may phat trien, qua deploy.sh
./deploy.sh --logs
```

### Cập nhật

- **Từ mã nguồn:** chạy lại `./deploy.sh`. Script tự gửi bản mới rồi `docker compose up -d --build`; Docker chỉ dựng lại các tầng thay đổi.
- **Từ ảnh dựng sẵn (bản prod):** kéo ảnh mới rồi dựng lại:

  ```bash
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml up -d
  ```

Dữ liệu nguồn tự thêm nằm trong volume `rapphim-data`, không bị mất khi dựng lại container.

### Rollback

Bản prod ghim phiên bản qua biến `TAG`. Để quay về một phiên bản cũ, đặt `TAG` trong `.env` (hoặc truyền trực tiếp) rồi dựng lại:

```bash
TAG=v1.2.3 docker compose -f docker-compose.prod.yml up -d
```

Với bản build từ mã nguồn, cách quay lui là `git checkout` về commit mong muốn rồi chạy lại `./deploy.sh`.

## Lưu ý tài nguyên: dịch vụ thuyết minh (dub) đang tắt

Dịch vụ thuyết minh (`dub`) hiện đang **tắt** trong `docker-compose.yml`. Lý do là phần ML của nó (PaddleOCR ONNX + `ffmpeg` + TTS) quá nặng so với sức homelab hiện tại. Mã nguồn vẫn còn nguyên ở thư mục `dub/` (có sẵn `Dockerfile`, dịch vụ FastAPI nghe cổng `8080` nội bộ) và tầng giao diện cũng còn hỗ trợ.

Để bật lại, cần làm ba việc:

1. **Thêm lại service `dub`** vào `docker-compose.yml`, build từ `./dub` và nối vào mạng `rapphim`:

   ```yaml
   dub:
     build:
       context: ./dub
     container_name: rapphim-dub
     restart: unless-stopped
     networks:
       - rapphim
   ```

2. **Đặt `DUB_INTERNAL_URL` cho web** để route handler `frontend/src/app/api/dub/[...path]/route.ts` biết gọi tới đâu (bên trong mạng Docker là tên dịch vụ và cổng nội bộ):

   ```yaml
   web:
     environment:
       API_INTERNAL_URL: http://backend:8080
       DUB_INTERNAL_URL: http://dub:8080
   ```

3. **Bật cờ `NEXT_PUBLIC_DUB_ENABLED`** khi build lại ảnh web. Trong `frontend/src/components/watch/VideoPlayer.tsx`, cờ này được đọc là `process.env.NEXT_PUBLIC_DUB_ENABLED === "true"`; vì là biến `NEXT_PUBLIC_` dùng trong component phía trình duyệt, nó được nhúng lúc build, nên phải đặt `NEXT_PUBLIC_DUB_ENABLED=true` rồi build lại `web`.

Sau ba bước, dựng lại bằng `docker compose up -d --build`. Hãy cân nhắc kỹ tài nguyên trước khi bật: dịch vụ này là nguyên nhân ngốn RAM/CPU khiến nó bị tắt ngay từ đầu.

## Kết luận

Chúng ta đã đi qua toàn bộ vòng đời triển khai RapPhim WareHouse trên homelab: kiến trúc ba container `dns` / `backend` / `web` trong mạng `172.29.0.0/16`, chuẩn bị `.env`, build và chạy bằng `docker compose up -d --build`, triển khai từ xa qua `deploy.sh`, vai trò của CoreDNS với IP tĩnh `172.29.0.53`, cùng các thao tác vận hành thường ngày (health-check, log, cập nhật, rollback) và cách bật lại dịch vụ dub khi có đủ tài nguyên.

Các tài liệu liên quan trong bộ:

- [`.env.example`](../../.env.example) — mẫu cấu hình đầy đủ kèm chú thích.
- [`docs/openapi.json`](../openapi.json) — đặc tả API để kiểm thử các endpoint sau khi triển khai.
- [`docs/ebook/van-khan-deploy.md`](../ebook/van-khan-deploy.md) — sổ tay sự cố DevOps đi kèm.
- `README.md` ở gốc dự án — tổng quan kiến trúc và cách chạy ở môi trường phát triển.
