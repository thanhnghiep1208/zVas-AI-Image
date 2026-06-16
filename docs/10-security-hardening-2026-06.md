# 10 - Security Hardening & Dependency Upgrade (06/2026)

## Tổng quan

Ngày: 2026-06-16. Bản hardening tập trung vào 4 lỗ hổng server-side đã xác định qua audit kiến trúc, kết hợp upgrade dependencies có breaking changes.

---

## 1. Content Security Policy (CSP)

**Trước:** `helmet({ contentSecurityPolicy: false })` — CSP hoàn toàn tắt.

**Sau:** CSP bật trên production với policy cụ thể:

```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc:  ["'self'", "'unsafe-inline'"],
    styleSrc:   ["'self'", "'unsafe-inline'"],
    imgSrc:     ["'self'", "data:", "blob:", "https:"],
    connectSrc: ["'self'", "https://*.googleapis.com", "https://*.google.com",
                 "https://www.googletagmanager.com", "https://www.google-analytics.com",
                 "https://analytics.google.com", "https://api.openai.com",
                 "https://*.bytepluses.com", "https://api.seedance.com"],
    fontSrc:    ["'self'", "data:"],
    frameSrc:   ["'none'"],
    objectSrc:  ["'none'"],
    baseUri:    ["'self'"],
    formAction: ["'self'"],
  }
}
```

Dev: CSP tắt như cũ (tránh conflict Vite HMR WebSocket).

**Tác động:** Ngăn XSS data-exfiltration sang domain không whitelist, chặn framing và object embed injection.

---

## 2. CORS Warning khi thiếu ALLOWED_ORIGINS

**Trước:** Nếu không set `ALLOWED_ORIGINS`, server im lặng dùng `origin: true` (cho phép mọi origin).

**Sau:** Production log `[WARN]` rõ ràng khi startup:

```
[WARN] ALLOWED_ORIGINS is not set — CORS is open to all origins.
       Set ALLOWED_ORIGINS=https://your-domain.com in production.
```

Behavior runtime không thay đổi (vẫn allow để không break deploy hiện tại). Warning giúp phát hiện qua Cloud Run logs.

---

## 3. Prompt Length Limit

**Trước:** Không có giới hạn độ dài prompt → risk DoS (token inflation, timeout).

**Sau:** Prompt > **4000 ký tự** trả `HTTP 400`:

```json
{ "error": "Prompt quá dài (tối đa 4000 ký tự)." }
```

Logic tại `server/lib/validateUserInput.ts` → `validatePrompt()`.

---

## 4. Password Minimum 12 Ký Tự

**Trước:** Tối thiểu 6 ký tự (quá yếu).

**Sau:** Tối thiểu **12 ký tự** cho `POST /api/admin/users` và `POST /api/admin/users/reset-password`.

**Lưu ý:** Tài khoản hiện có **không bị ảnh hưởng** — kiểm tra chỉ chạy khi tạo mới hoặc reset.

Logic tại `server/lib/validateUserInput.ts` → `validatePassword()`.

---

## 5. Rate Limit Fallback Warning

**Trước:** Khi Firestore rate limit lỗi, fallback memory store âm thầm — không biết đang mất distributed consistency.

**Sau:** Log rõ hơn:

```
[WARN] Firestore rate limit unavailable — falling back to in-memory store.
       This is NOT safe in multi-instance deployments.
```

---

## 6. Dependency Upgrades (Breaking)

### firebase-admin v13 → v14

**Breaking change:** Top-level `admin` namespace bị remove.

**Migration** tại `server/firebaseAdmin.ts` và `server/lib/rateLimit/firestoreStore.ts`:

```typescript
// Trước
import admin from 'firebase-admin';
admin.credential.cert(sa)
admin.apps.length ? admin.app() : admin.initializeApp(opts)
admin.auth()
admin.firestore.FieldValue.serverTimestamp()

// Sau (modular API)
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
```

**Node.js requirement:** >= 22 (Docker image đã dùng `node:22-bookworm-slim` ✓).

### vite v6 → v8

Đi kèm: `@tailwindcss/vite` v4.2.1 → v4.3.1, `@vitejs/plugin-react` v5 → v6.

Build config (`vite.config.ts`) không cần thay đổi — compatible.

---

## 7. TDD — validateUserInput

Tạo `server/lib/validateUserInput.ts` theo quy trình TDD:

- **RED:** viết `server/lib/validateUserInput.test.ts` (10 cases) → xác nhận fail.
- **GREEN:** tạo `validatePassword` + `validatePrompt` → 10/10 pass.
- **REFACTOR:** routes `generate.ts` và `adminUsers.ts` import từ module này thay vì inline logic.

---

## Trạng thái sau hardening

| Kiểm tra | Kết quả |
|----------|---------|
| `npm run lint` | ✅ 0 errors |
| `npm test` | ✅ 26/26 pass |
| `npm run build` | ✅ Built 8.89s |
| High severity vulnerabilities | ✅ 0 (trước: 7) |
| Moderate vulnerabilities | ⚠️ 6 (uuid trong firebase-admin transitive deps — không khai thác được trong context này) |

Tài liệu liên quan: `docs/05-security-roles.md` · `docs/03-backend-api.md` · `docs/06-live-deployment.md`
