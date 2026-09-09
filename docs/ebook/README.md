# Từ Commit Đến Container

Sổ tay sự cố DevOps rút từ chính nhật ký triển khai dự án này: Git, GitHub CLI,
Dockerfile, ảnh Docker, CI/CD. 34 trang, 19 sự cố có thật đánh số `SC-01`…`SC-19`.

Bản đã dựng: [`Tu-Commit-Den-Container.pdf`](Tu-Commit-Den-Container.pdf)

## Dựng lại

```bash
pip install reportlab fonttools
python dung.py Tu-Commit-Den-Container.pdf
```

`reportlab` là bắt buộc. `fonttools` không bắt buộc nhưng **nên có**: nó dùng để
kiểm phông chữ có đủ glyph tiếng Việt hay không. Thiếu nó thì phép kiểm bị bỏ
qua, và một phông thiếu dấu sẽ in ra chữ thành ô vuông mà không báo gì.

## Phông chữ

Bộ dựng tự tìm phông trong các thư mục hệ thống và chọn bộ đầu tiên **đủ 119 ký
tự riêng của tiếng Việt**, theo thứ tự ưu tiên:

| | Thân sách | Khối mã |
| --- | --- | --- |
| Windows | Constantia | Consolas |
| Linux | DejaVu Serif, Liberation Serif | DejaVu Sans Mono, Liberation Mono |
| Dự phòng | Times New Roman | Courier New |

Không tìm được bộ nào đủ thì nó dừng kèm hướng dẫn cài, chứ không âm thầm dựng
ra một quyển sách đầy ô vuông. Trên Debian/Ubuntu:

```bash
apt-get install fonts-dejavu-core
```

Phép kiểm đọc thẳng bảng `cmap` của phông. Không dùng `stringWidth` — hàm đó trả
về số hợp lệ ngay cả với ký tự phông không hề chứa, nên nó không phát hiện được
gì. Chính lỗi này đã lọt một lần lúc dựng bản đầu, và được ghi lại trong sách ở
mục 1.2.

## Các tệp

| Tệp | Việc |
| --- | --- |
| `dung.py` | Ráp các phần rồi xuất PDF |
| `render.py` | Trình bày: phông, kiểu chữ, khung, mục lục, chân trang |
| `phan_a.py` | Nội dung: bìa, lời mở, nguyên tắc, Git, GitHub CLI |
| `phan_b.py` | Nội dung: Docker, đa kiến trúc, phát hành, phụ lục |

Sửa nội dung thì chỉ đụng vào `phan_a.py` / `phan_b.py`. Chúng dùng một bộ đánh
dấu rút gọn: `` `mã` ``, `**đậm**`, `*nghiêng*`.

Các khối dựng sẵn trong `render.py`:

```python
P("Một đoạn văn với `mã` và **chữ đậm**.")
h2("Tiêu đề mục"), h3("Tiêu đề nhỏ")
khoi_ma("dong lenh", "Chú thích tuỳ chọn")
hop("BÀI HỌC", ["Nội dung"], XANH)     # DO cho lỗi, MUC cho ghi chú
bang(["Cột 1", "Cột 2"], [["a", "b"]], [200, 150])
cham(["Gạch đầu dòng thứ nhất", "Thứ hai"])
```

Mục lục tự sinh từ các tiêu đề, và số trang chỉ đúng nhờ `multiBuild` chạy hai
lượt — lượt đầu thu thập vị trí, lượt sau mới điền được số.

## Bản PDF trong repo

`Tu-Commit-Den-Container.pdf` được commit sẵn để đọc ngay mà không cần cài
Python. Không có quy trình tự động nào dựng lại nó, nên **sửa nội dung thì nhớ
chạy `dung.py` và commit cả tệp PDF**, nếu không hai thứ sẽ lệch nhau.
