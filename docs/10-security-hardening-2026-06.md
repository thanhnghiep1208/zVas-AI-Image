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

## 2. CORS — Fail Closed khi thiếu ALLOWED_ORIGINS

**Trước:** Nếu không set `ALLOWED_ORIGINS`, server im lặng dùng `origin: true` (cho phép mọi origin). Sau đó nâng lên log `[WARN]` nhưng vẫn allow.

**Sau:** Production **chặn toàn bộ cross-origin requests** khi `ALLOWED_ORIGINS` không được set:

```typescript
// server.ts
origin: allowedOriginsEnv
  ? (origin, cb) => { /* whitelist check */ }
  : isProd
    ? false   // chặn tất cả cross-origin
    : true,   // dev: open
```

Log khi startup (production, không có `ALLOWED_ORIGINS`):

```
[WARN] ALLOWED_ORIGINS is not set — all cross-origin requests are blocked in production.
       Set ALLOWED_ORIGINS=https://your-domain.com to allow browser clients.
```

**Hệ quả:** Deploy production **bắt buộc** phải set `ALLOWED_ORIGINS`. Thiếu → browser không thể gọi API (mặc dù cùng origin vẫn hoạt động — chỉ cross-origin bị chặn).

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

## 5. Rate Limit — Fail Closed khi Firestore lỗi

**Trước:** Khi Firestore rate limit lỗi, fallback sang in-memory store âm thầm — không chia sẻ trạng thái giữa các Cloud Run instances → có thể bypass rate limit trong outage.

**Sau:** Production **fail closed** — ném lỗi thay vì fallback:

```typescript
// server/lib/rateLimit/index.ts
export async function tryConsumeRateLimit(userId: string): Promise<boolean> {
  if (cachedBackend === 'firestore') {
    return tryConsumeRateLimitFirestore(userId); // throws nếu Firestore lỗi
  }
  return tryConsumeRateLimitMemory(userId);
}
```

Route handler bắt lỗi và trả **HTTP 503**:

```typescript
// server/routes/rateLimit.ts
try {
  allowed = await tryConsumeRateLimit(userId);
} catch (error) {
  console.error('[ERROR] Rate limit backend unavailable:', error);
  return res.status(503).json({ error: 'rate_limit_unavailable' });
}
```

**Hệ quả:** Firestore outage → request bị từ chối bằng 503 thay vì được cho qua không giới hạn. Dev local không bị ảnh hưởng (dùng memory store, không bao giờ throw).

---

## 5b. SSRF — Validate Base URL trong `/api/generate`

**Trước:** `body.seedanceBaseUrl` và `body.seedreamBaseUrl` được truyền thẳng vào `fetch()` mà không kiểm tra — client có thể redirect request đến server tùy ý (SSRF).

**Sau:** Base URL được validate trước khi dùng bằng hàm dùng chung `validateHttpsBaseUrl`:

```typescript
// server/lib/validateBaseUrl.ts  (shared)
export function validateHttpsBaseUrl(baseUrl, provider)
  : { ok: true; normalized: string } | { ok: false; error: string }

// server/routes/generate.ts
const baseCheck = validateHttpsBaseUrl(baseUrlRaw, 'Seedance');
if (baseCheck.ok === false) {
  return res.status(400).json({ error: baseCheck.error });
}
const baseUrl = baseCheck.normalized; // trailing slash stripped
```

Kiểm tra: URL phải parse được và protocol phải là `https:`. Cùng logic đã có trong `providerTest.ts` — nay tách ra `server/lib/validateBaseUrl.ts` để share.

**Phạm vi:** Áp dụng cho cả Seedance và Seedream trong `generate.ts`. `providerTest.ts` refactor để import từ shared lib thay vì inline.

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
