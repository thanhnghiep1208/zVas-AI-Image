# AI Image ZVAS

Ứng dụng web tạo và biến thể ảnh bằng AI (Gemini, OpenAI DALL·E 3, Seedance), kết hợp Firebase Auth/Firestore, Express và Vite.

**Tài liệu chi tiết:** xem [DOCUMENTATION.md](./DOCUMENTATION.md) (trang mục lục) hoặc đọc trực tiếp bộ tài liệu trong thư mục `docs/`. **Shell UI, logo làm mới vùng làm việc, banner Create, upload/kết quả:** [docs/02-frontend-architecture.md](./docs/02-frontend-architecture.md).

---

## Yêu cầu

- [Node.js](https://nodejs.org/) (khuyến nghị LTS)

## Cài đặt & chạy local

```bash
npm install
```

Cấu hình khóa API phía **server** (không đặt key thật trong `VITE_`*):

- **Mẫu env:** `[.env.example](./.env.example)` — sao chép thành `.env` hoặc `.env.local` (đã gitignore).
- **Mẫu Firebase client:** `[firebase-applet-config.example.json](./firebase-applet-config.example.json)` — sao chép thành `firebase-applet-config.json` (file này **không** có trong repo, đã `.gitignore`; key web nên giới hạn domain trong Firebase Console).
- Biến môi trường: `GEMINI_API_KEY`, hoặc `OPENAI_API_KEY`, `SEEDANCE_API_KEY` tùy provider.
- Hoặc cấu hình trong Firestore `settings/global` qua **Admin Dashboard** sau khi đăng nhập admin.

Chạy dev (Express + Vite HMR):

```bash
npm run dev
```

Mặc định lắng nghe cổng **3000** (hoặc `PORT` trong env).

Build production và chạy server phục vụ `dist` + API:

```bash
npm run build
npm start
```

---

## Production (live)

Ứng dụng chạy thật = **một process Node** phục vụ `dist/` + `/api/`*. Build frontend trước, rồi `NODE_ENV=production`.

**Biến môi trường (server):**


| Biến                                                     | Mô tả                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                   | Cổng HTTP (Cloud Run thường `8080`; mặc định local `3000`)                                                                                                                                                                                                                              |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `SEEDANCE_API_KEY` | Key nhà cung cấp AI (hoặc cấu hình trong Firestore `settings/global`)                                                                                                                                                                                                                   |
| Firebase Admin                                           | Trên **Google Cloud Run** dùng service account của runtime — không cần file JSON nếu project trùng Firebase. Chạy ngoài GCP: đặt `[GOOGLE_APPLICATION_CREDENTIALS](https://cloud.google.com/docs/authentication/application-default-credentials)` trỏ tới JSON có quyền Firestore/Auth. |


**Docker (image production):**

```bash
docker build -t ai-image-zvas:1.0405 .
docker run --rm -p 8080:8080 \
  -e GEMINI_API_KEY=... \
  ai-image-zvas:1.0405
```

Khi `docker build`, cần có `firebase-applet-config.json` trong **ngữ cảnh build** (tạo từ file `.example` trên máy/CI — không lưu trong Git). File được `COPY` vào image cho `server.ts` và đã được bundle lúc `npm run build`. API key nhà cung cấp AI vẫn truyền qua `-e` / secret manager, không nhúng vào repo.

---

## Scripts


| Lệnh            | Mô tả                                   |
| --------------- | --------------------------------------- |
| `npm run dev`   | `tsx server.ts` — API + Vite middleware |
| `npm run build` | `vite build` → thư mục `dist/`          |
| `npm start`     | Production: static + Express API        |
| `npm run lint`  | `tsc --noEmit`                          |


---

## Công nghệ (rút gọn)

React 19, TypeScript, Vite 6, Tailwind CSS 4, Firebase (Auth + Firestore), Express 5, `@google/genai`, IndexedDB (`idb-keyval`), Sonner.

---

## Bảo mật

- Không commit API key thật.
- **`firebase-applet-config.json`** không được đưa lên Git (chỉ dùng bản `.example` trong repo). Nếu bản thật từng nằm trong lịch sử commit, nên **xoay / thu hồi Web API key** trong Firebase Console và cân nhắc dọn lịch sử (`git filter-repo` / BFG).
- Ưu tiên Secret Manager / biến môi trường trên Cloud Run cho các key nhà cung cấp AI.
- Chi tiết mục **Bảo mật** trong [DOCUMENTATION.md](./DOCUMENTATION.md).

