# RapPhim - Frontend

Giao diện Next.js 16 (App Router) theo phong cách YouTube cho RapPhim WareHouse.

## Chạy

```bash
npm install
npm run dev
```

Backend phải chạy sẵn ở `http://localhost:8080`. Đổi địa chỉ trong `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production, đồng thời kiểm tra type |
| `npm start` | Chạy bản đã build |
| `npx eslint .` | Lint |

Xem [README ở thư mục gốc](../README.md) để biết kiến trúc và tài liệu API.
