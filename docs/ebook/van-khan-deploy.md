# Văn khấn deploy

> *Coda vui cho sổ tay sự cố. "Văn khấn deploy" là một thể loại hài dân gian được dân
> lập trình Việt yêu thích — nhại thể văn khấn cổ để tự trào về nỗi thấp thỏm mỗi lần
> đẩy code lên máy chủ. Đọc cho vui, không phải nghi lễ thật.*
>
> *Mỗi câu khấn dưới đây là một sự cố có thật trong nhật ký triển khai RapPhim
> WareHouse — xem sổ tay [`README.md`](README.md) để biết đầu đuôi từng cái.*

---

## I. Văn khấn trước khi deploy

*Đọc lúc con trỏ đã đặt trên phím Enter, tay `./deploy.sh` chưa dám gõ.*

*Nam mô Bản Địa Homelab, nam mô Chư Vị Container.* (vái 3 vái)

Con lạy chín phương Cloud, mười phương Registry.
Con kính lạy Đức Thần **Docker**, ngài Thổ Địa `nqatech@192.168.100.169`,
chư vị Long Mạch **GHCR** cai quản ảnh amd64 lẫn arm64.

Hôm nay, giờ lành `git push`, ngày `main` khai hoa,
Tín chủ con là **nguyenquocanhz**, ngụ tại `D:\RapPhimWareHouse`,
một dạ chí thành: đã `mvnw test` bốn mươi tư keo đều xanh,
đã `eslint` sạch bụi trần, đã `docker compose config` soi tỏ ba lần.

Con thành tâm sửa biện phẩm vật — một `Dockerfile` đa tầng, một `mem_limit` chặn cửa,
một `-Xmx` ghim heap — dâng lên trước án. Cúi xin chư vị chứng giám lòng thành:

> — Xin cho `next build` đừng nuốt ba gigabyte rồi ngã giữa đàng.
> — Xin ngài **OOM-killer** ngoảnh mặt làm ngơ, chớ vung đao chém nhầm `sshd`.
> — Xin **TheMovieDB** thôi bị chặn SNI, cho một `handshake` trọn vẹn.
> — Xin `HEALTHCHECK` gọi `healthy`, xin volume đừng phán `AccessDenied`.
> — Và trên hết, xin đừng để ai gõ vào con dòng chữ **"chưa xong lỗi kìa"**.

Con nguyện một lòng giữ đạo mà hiến pháp đã truyền:
*Đo, không đoán. Chưa merge là chưa xong. Không lách rào an toàn.*

Ví bằng có điều sơ suất — ảnh còn `private`, khoá v3 lạc sang ô v4,
`localhost:8080` sót lại trong `.next` — cúi mong chư vị đại xá,
ban cho con một `git revert` nhẹ nhàng, một `reflog` cứu rỗi.

**Phục duy cẩn cáo — `./deploy.sh` khởi!** 🚀

---

## II. Văn khấn tạ

*Đọc sau khi `docker compose ps` báo cả ba container `healthy`, trang đã lên hình.*

*Nam mô Thành Công Viên Mãn, nam mô Chư Vị Đã Về `Up (healthy)`.* (vái 3 vái)

Con lạy chín phương Cloud, mười phương Registry.
Hôm nay đàn tràng đã mãn, `deploy.sh` đã tới dòng **"==> Xong"**,
`rapphim-backend`, `rapphim-web`, `rapphim-dns` — ba cõi đều xanh đèn,
cổng `7100` mở hội, cổng `7101` thông đường.

Tín chủ con là **nguyenquocanhz**, nay lễ bạc tâm thành, cúi đầu tạ ơn:

> — Tạ ơn ngài **OOM-killer** đã ngoảnh mặt, để `sshd` bình an một phen.
> — Tạ ơn Long Mạch **GHCR** cho ảnh hoá công khai, muôn nơi kéo được.
> — Tạ ơn runner **arm64** dựng thật không cần giả lập, hai kiến trúc về chung một nhãn.
> — Tạ ơn Đức Thần **TMDB** đã thương — hoá ra khoá nào có sai, chỉ là lạc mất ô.
> — Tạ ơn `mem_limit` đã khoanh vùng, từ nay OOM có nổi cũng chỉ một container gánh.

Nhớ thuở hàn vi: trang trắng trơn ba mươi chín ký-lô, phim không một bóng;
`0 phim` mà tưởng lỗi bộ lọc, `handshake` đứt mà ngỡ nguồn hư.
Nay đã tỏ tường, nhờ giữ trọn một chữ **Đo**.

Con xin khắc cốt ghi tâm, tiếp tục hành đạo:
mỗi thay đổi một nhánh, mỗi nhánh một PR, mỗi PR đủ hai mục *Đã kiểm* và *Chưa kiểm*.
Chốn `paths-ignore` đã nghiệm cả hai chiều, chốn `AGENTS.md` đã an vị đầu repo.

Lễ tuy đơn sơ — một `git tag`, một dấu ✓ xanh trên GitHub Actions —
mà lòng thành kính dâng lên. Cúi mong chư vị tiếp tục phù trì,
cho những lần `deploy` sau cũng thuận buồm như hôm nay.

**Phục duy cẩn cáo — `git tag -a v1.0`, hạ lễ!** 🙏

---

*Hết. Nguyện `main` mãi xanh, `test` chẳng bao giờ đỏ.*
