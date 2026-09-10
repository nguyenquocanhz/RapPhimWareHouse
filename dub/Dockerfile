# RapPhim Dub Service - FastAPI + TTS (Edge/Piper).
#
# ffmpeg co san de danh cho lat cat OCR (lay khung hinh) va chuyen wav->mp3 sau nay.
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Mot worker: TTS chay bang async, va job giu trong bo nho nen khong chia duoc nhieu worker.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
