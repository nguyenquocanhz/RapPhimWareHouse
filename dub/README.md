# RapPhim Dub Service (`rapphim-dub`)

Microservice sinh **giọng thuyết minh tiếng Việt** cho phim, tách riêng khỏi backend Java
vì OCR / dịch / TTS là ML nặng.

## Pipeline mục tiêu

```
phim (hardsub) ──▶ OCR khung hình ──▶ cue (chữ + mốc giờ)
                                          │
                        dịch zh/en → vi ──┤
                                          ▼
                         TTS (Piper offline | Edge online)
                                          ▼
                  manifest cue + audio ──▶ player phát đồng bộ, "ducking" tiếng gốc
```

Không re-mux ở server: player phát từng đoạn audio theo mốc giờ và giảm tiếng gốc lúc đọc.

## Lộ trình theo lát cắt

- **Phase 1 (xong):** dịch vụ + API job + **TTS từ cue có sẵn** (Edge chạy được; Piper
  cần model).
- **Phase 2 (xong):** **OCR hardsub → cue** — `POST /api/ocr`. Dùng ffmpeg lấy khung hình
  vùng phụ đề + **RapidOCR** (model PaddleOCR đóng gói ONNX, CPU, mạnh tiếng Trung), gộp
  khung trùng → cue kèm mốc giờ. Đã kiểm tra: clip hardsub tiếng Trung → 3 cue đúng chữ + giờ.
- **Phase 3 (xong):** **dịch zh/en → vi** — `POST /api/translate`. Google (online, mặc định,
  dịch thẳng zh→vi) + Argos (offline, tùy chọn). Giữ mốc giờ, lưu bản gốc ở `text_src`.
- **Phase 4:** ghép chuỗi `POST /api/dub/from-video` (OCR → dịch → TTS) + tích hợp player
  (nút "Thuyết minh", chọn engine/giọng, phát đồng bộ + ducking).

## API (Phase 1)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra sống |
| GET | `/api/voices` | Danh sách giọng theo engine |
| POST | `/api/dub` | Body `{cues:[{start,end,text}], engine:"edge"\|"piper", voice?}` → `{jobId}` |
| GET | `/api/dub/{jobId}` | Trạng thái + cue kèm URL audio |
| GET | `/api/dub/{jobId}/media/{name}` | Tệp audio của cue |
| POST | `/api/ocr` | Body `{url, fps?, region_top?, region_height?, start?, duration?, min_score?}` → `{jobId}` |
| GET | `/api/ocr/{jobId}` | Trạng thái + cue OCR `{start,end,text}` (chữ ngôn ngữ gốc) |
| POST | `/api/translate` | Body `{cues:[{start,end,text}], target?, source?, engine?}` → cue kèm `text` (vi) + `text_src` |

## Chạy thử cục bộ

```bash
pip install -r requirements.txt
DUB_MEDIA_DIR=./_media uvicorn app:app --port 8080
```

## Biến môi trường

- `DUB_MEDIA_DIR` — thư mục lưu audio (mặc định `/data/dub`).
- `PIPER_BIN`, `PIPER_MODEL_DIR` — cho engine Piper offline (`<voice>.onnx`).
