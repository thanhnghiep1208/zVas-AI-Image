# 05 - Security & Roles

## Nguyên tắc bảo mật

- Key provider chỉ dùng phía server.
- Không commit key thật vào repo.
- Không dùng `VITE_*` cho secret runtime.
- Secret production nên lấy từ Secret Manager.
- Không lưu API key provider trong Firestore `settings/global`.

## Firestore rules tổng quát

- `/api/generate`, `/api/rate-limit`, `/api/admin/*` yêu cầu Firebase ID token hợp lệ (admin routes thêm `requireAdmin`).
- Rules kiểm soát read/write theo role.
- Named database cần deploy rules/indexes đúng cấu hình `firebase.json` (id = `firestoreDatabaseId` trong `firebase-applet-config.json`).
- **`users/{userId}`:** user đọc doc của chính mình (`isOwner`); admin/advice đọc theo `canViewAnalyticsDashboard`.
- **`users/{userId}/sessions/{sessionId}`:** chỉ owner (`isOwner(userId)`) được read/create/update; dùng cho theo dõi phiên đa thiết bị (xem `docs/08-auth-users-setup.md`).
- **`history/{historyId}`:** đọc/ghi khi `resource.data.uid == request.auth.uid`; admin/advice đọc toàn bộ cho analytics; client list phải có `where('uid', '==', request.auth.uid)`.
- `settings/global` chỉ cho phép ghi các field an toàn (enabled providers, model/base URL, `updatedAt`), chặn key nhạy cảm.
- **`rate_limit_windows/{docId}`:** `allow read, write: if false` — counter rate limit chỉ Cloud Run Admin SDK (`server/lib/rateLimit/firestoreStore.ts`), client không đọc/ghi.

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image
```

## Phân quyền role

### `admin`

- Truy cập đầy đủ: Users, Settings, Analytics.
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

## Checklist bảo mật nhanh

- Đã giới hạn Secret Manager IAM cho runtime service account.
- Đã giới hạn API key web theo domain trong Firebase/GCP.
- Đã deploy rules/indexes đúng project + database (gồm rule `rate_limit_windows` sau refactor 05/2026).
- CORS giới hạn origin — set env `ALLOWED_ORIGINS` đúng domain trước khi deploy (xem `docs/09-optimize-2026-06.md`).
- Helmet middleware active — không lộ X-Powered-By, có HSTS/X-Frame-Options.
- Error log `handleFirestoreError` chỉ ghi email/provider trong môi trường dev.