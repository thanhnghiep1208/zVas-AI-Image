# 05 - Security & Roles

## Nguyên tắc bảo mật

- Key provider chỉ dùng phía server.
- Không commit key thật vào repo.
- Không dùng `VITE_*` cho secret runtime.
- Secret production nên lấy từ Secret Manager.
- Không lưu API key provider trong Firestore `settings/global`.

## Bảo vệ API (server)

- Mọi route `/api/*` yêu cầu Firebase ID token hợp lệ (`authenticate`).
- `/api/generate`, `/api/provider-test`, `/api/provider-keys` thêm `requireApproved`: user `pending`/`rejected`/thiếu hồ sơ bị `403` dù đã đăng nhập Auth — server không tin cổng chặn phía client.
- `/api/admin/*` thêm `requireAdmin`.
- `/api/generate` và `/api/provider-test` chịu rate limit 10 req/phút/user, fail closed (`503`) nếu store lỗi.
- Base URL Seedance/Seedream: chỉ `https`, chặn IP nội bộ + DNS rebinding (`ssrfSafeFetch`), và phải thuộc allowlist host — tránh rò key server ra host lạ (`docs/13`, `docs/16`).
- Provider bị ép theo `settings/global.enabledProviders`.

## Firestore rules (chi tiết)

- Rules kiểm soát read/write theo role.
- Named database cần deploy rules/indexes đúng cấu hình `firebase.json` (id = `firestoreDatabaseId` trong `firebase-applet-config.json`).
- **`users/{userId}`:** user đọc doc của chính mình (`isOwner`); admin/advice đọc theo `canViewAnalyticsDashboard`.
- **`users/{userId}/sessions/{sessionId}`:** chỉ owner (`isOwner(userId)`) được read/create/update; dùng cho theo dõi phiên đa thiết bị (xem `docs/08-auth-users-setup.md`).
- **`history/{historyId}`:** đọc/ghi khi `resource.data.uid == request.auth.uid`; admin/advice đọc toàn bộ cho analytics; client list phải có `where('uid', '==', request.auth.uid)`.
- **`settings/public`:** ai cũng đọc được (kể cả chưa đăng nhập) — chỉ chứa `loginContactText` (≤ 500 ký tự) hiển thị trên popup đăng nhập; chỉ admin ghi (`isSafePublicSettings`).
- `settings/global`: user đã đăng nhập đọc; chỉ admin ghi và chỉ các field an toàn (enabled providers, model/base URL, `geminiFlashRollback`, `updatedAt`), chặn key nhạy cảm. Thêm field mới → sửa `isSafeGlobalSettings()` và deploy rules **trước** app.
- **`rateLimits/{userId}`:** collection cũ, code hiện tại không dùng.
- **`rate_limit_windows/{docId}`:** `allow read, write: if false` — counter rate limit chỉ Cloud Run Admin SDK (`server/lib/rateLimit/firestoreStore.ts`), client không đọc/ghi.

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image
```

## Phân quyền role

### `admin`

- Truy cập đầy đủ: Users (tạo, duyệt, reset mật khẩu), Settings (provider/model, thông tin liên hệ), Analytics.
- Luôn qua `requireApproved` bất kể `status`.
- Có quyền ghi `settings/global`, `monthly_costs`.

### `advice`

- Chỉ xem Analytics dashboard.
- Không quản lý user, không sửa settings/costs.
- Được đọc `analytics_events`, `analytics_monthly_rollups`, `monthly_costs`, `users`, `history` theo rules hiện tại để hiển thị dashboard.

### `editor`

- Không vào admin dashboard.
- Dùng các chức năng tạo ảnh thông thường.
- Cần `users/{uid}` với `status: approved` để vào app (xem `docs/08-auth-users-setup.md`).

## Đăng nhập client

- Username không gồm `@` → app thêm suffix `@zvas.local` trước khi gọi Firebase Auth.
- Sau Auth thành công, bắt buộc có document Firestore `users/{uid}` — không dùng username làm document ID.

## Chính sách mật khẩu

- Tối thiểu **12 ký tự** — áp dụng khi admin tạo user mới hoặc reset password.
- Tài khoản hiện có **không bị ảnh hưởng** — Firebase Auth lưu hash riêng, server không kiểm tra lại khi login.
- Logic tập trung tại `server/lib/validateUserInput.ts` (`validatePassword`).

## Content Security Policy (CSP)

- **Production:** CSP bật với whitelist `connect-src` cho Firebase, Google APIs, GA4, OpenAI, Seedance/BytePlus, Sentry. `frame-src 'none'`, `object-src 'none'`.
- **Development:** CSP tắt để tránh conflict với Vite HMR.
- Cấu hình tại `server.ts` — directive `scriptSrc` giữ `'unsafe-inline'` do Vite module preload injection; có thể tighten bằng hash nếu cần.

## Checklist bảo mật nhanh

- Đã giới hạn Secret Manager IAM cho runtime service account.
- Đã giới hạn API key web theo domain trong Firebase/GCP.
- Đã deploy rules/indexes đúng project + database (gồm rule `rate_limit_windows` sau refactor 05/2026).
- CORS giới hạn origin — set env `ALLOWED_ORIGINS` đúng domain trước khi deploy (xem `docs/09-optimize-2026-06.md`). **Thiếu biến này trên production → log `[WARN]` và chặn mọi request cross-origin** (app same-origin vẫn chạy).
- Helmet middleware active — CSP bật trên production, HSTS/X-Frame-Options/X-Content-Type-Options.
- Error log `handleFirestoreError` chỉ ghi email/provider trong môi trường dev.
- Password tối thiểu 12 ký tự cho tài khoản mới/reset — validated tại `server/lib/validateUserInput.ts`.