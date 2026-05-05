# 03 - Backend & API

## Backend runtime

- `server.ts` dùng Express 5.
- `NODE_ENV=production`: serve static từ `dist/` + API routes.
- Dev mode: nạp Vite middleware động.

## Database/Auth

- Firestore named database (theo `firebase-applet-config.json`).
- Firebase Auth (Google sign-in) cho client.
- Firebase Admin SDK verify ID token ở backend.

## API endpoints

### `POST /api/rate-limit`

- Yêu cầu `Authorization: Bearer <Firebase ID token>`.
- Giới hạn in-memory: 10 request/phút/user.

### `POST /api/generate`

- Yêu cầu token Firebase hợp lệ.
- Input gồm `prompt`, model/provider, ảnh main/reference (base64).
- Provider hỗ trợ: `gemini`, `openai`, `seedance`.
- Trả về `imageBase64` + metadata token usage.

## Quy tắc key/provider

Thứ tự lấy API key phía server:

1. Biến môi trường (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `SEEDANCE_API_KEY`).
2. Firestore `settings/global` (do admin cập nhật).

## Ghi chú vận hành

- Frontend không giữ key bí mật provider.
- Backend là điểm duy nhất gọi provider trực tiếp.
- OpenAI/Seedance route sẽ trả lỗi cấu hình nếu key chưa có.