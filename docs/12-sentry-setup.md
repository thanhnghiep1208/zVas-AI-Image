# Sentry (error tracking)

## Tạo project trên sentry.io

1. Đăng ký / đăng nhập tại https://sentry.io.
2. Tạo **Organization** (nếu chưa có).
3. Tạo 2 project trong org đó (khuyến nghị tách riêng để filter dễ hơn):
   - Platform **Express** → đặt tên ví dụ `ai-image-zvas-backend`.
   - Platform **React** → đặt tên ví dụ `ai-image-zvas-frontend`.
4. Mỗi project có 1 DSN riêng, xem tại **Project Settings → Client Keys (DSN)**.

## Cấu hình biến môi trường

Điền vào `.env.local` (đã gitignore, xem `.env.example`):

```
SENTRY_DSN=https://xxxx@oyyyy.ingest.sentry.io/zzzz      # project backend
VITE_SENTRY_DSN=https://aaaa@obbbb.ingest.sentry.io/cccc  # project frontend
```

Không set biến nào thì Sentry SDK ở phía đó tự tắt (`server/instrument.ts` và
`lib/sentry.ts` đều no-op nếu thiếu DSN) — an toàn khi chạy local không cần Sentry.

## Upload source maps khi build (tuỳ chọn)

Để đọc được stack trace từ code gốc (chưa minify) trên dashboard Sentry:

1. Tạo **Auth Token** tại https://sentry.io/settings/account/api/auth-tokens/
   với scope `project:releases` (org-level token khuyến nghị hơn internal integration).
2. Lấy **org slug** và **project slug** (frontend project) từ URL project trên Sentry.
3. Thêm vào `.env.local`:

```
SENTRY_ORG=ten-org-cua-ban
SENTRY_PROJECT=ai-image-zvas-frontend
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

4. `npm run build` — nếu đủ 3 biến trên, `vite.config.ts` sẽ tự sinh + upload source
   maps rồi xoá file `.map` khỏi `dist/` (không serve công khai). Thiếu biến nào thì
   build vẫn chạy bình thường, chỉ là không upload.

Token này chỉ cần cho máy/CI chạy `npm run build` để publish, **không cần** trên
server chạy `npm start` runtime.

## Kiểm tra hoạt động

- Backend: gọi 1 route ném lỗi (hoặc thêm tạm `throw new Error('sentry test')` trong
  1 handler), request route đó, xem event xuất hiện trong Sentry project backend.
- Frontend: mở console, chạy `throw new Error('sentry test')`, hoặc trigger lỗi UI —
  `ErrorBoundary` (`components/ErrorBoundary.tsx`) sẽ gọi `Sentry.captureException`.
