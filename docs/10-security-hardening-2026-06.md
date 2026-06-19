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

## 5. Rate Limit — Fix TOCTOU race condition + Fail Closed khi Firestore lỗi (2026-06-19)

**Vấn đề TOCTOU (Time-Of-Check-Time-Of-Use):** Trước đây, rate limit dùng 2 request tách biệt — client gọi `POST /api/rate-limit` để "đặt chỗ", rồi gọi `POST /api/generate`. Client có thể bypass giới hạn bằng cách gọi rate-limit một lần, sau đó gửi nhiều generate song song trước khi counter cập nhật.

**Trước:** Route `/api/rate-limit` tách biệt; `server/routes/generate.ts` không kiểm tra limit.

**Sau:** `tryConsumeRateLimit()` được gọi trực tiếp bên trong `createPostGenerateHandler`, ngay đầu handler — trước mọi logic generate:

```typescript
// server/routes/generate.ts
const { uid } = (req as AuthenticatedRequest).user;
let rateLimitAllowed: boolean;
try {
  rateLimitAllowed = await tryConsumeRateLimit(uid);
} catch (err) {
  console.error('[ERROR] Rate limit backend unavailable:', err);
  return res.status(503).json({ error: 'rate_limit_unavailable' });
}
if (!rateLimitAllowed) {
  return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
}
```

Check và generate là **một transaction HTTP duy nhất** — không còn cửa sổ race condition.

Route `/api/rate-limit` và file `server/routes/rateLimit.ts` đã bị **xóa**. Client (`services/geminiService.ts`) bỏ pre-flight call, gọi thẳng `/api/generate`.

**Fail closed:** Nếu Firestore rate limit backend throw, generate trả **HTTP 503** (`rate_limit_unavailable`) thay vì cho qua. Dev dùng memory store — không ảnh hưởng.

**Error code analytics:** Message `'Rate limit exceeded...'` chứa "rate limit" → detection pattern `msgLower.includes('rate limit')` trong `geminiService.ts` → `errorCode = 'rate_limit'` ✓

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

## 6. Xóa Vite `define` inject API key vào client bundle (2026-06-19)

**Trước:** `vite.config.ts` có block `define` inject hai biến môi trường vào bundle JavaScript client lúc build:

```typescript
define: {
  'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
},
```

**Rủi ro:** Nếu CI/CD build pipeline vô tình có `GEMINI_API_KEY` trong environment (ví dụ shared env vars), giá trị thật sẽ bị hardcode vào `dist/*.js` — expose cho bất kỳ ai xem source.

**Sau:** Block `define` và import `loadEnv` bị xóa hoàn toàn khỏi `vite.config.ts`. Bundle client không còn đọc bất kỳ API key nào từ build environment.

**Tại sao không ảnh hưởng chức năng:**

- Không có file client nào chứa literal `process.env.API_KEY` hay `process.env.GEMINI_API_KEY` — Vite define thực chất không substitute gì trong bundle hiện tại.
- `utils/runtimeEnv.ts` dùng dynamic access `process.env[key]` (không phải literal) — không bị Vite define match. Có guard `typeof process !== 'undefined'` → không throw trong browser.
- `hooks/useGlobalSettingsAndApiKey.ts` chỉ dùng kết quả `getRuntimeEnvValue()` để set boolean `hasApiKey` — khi không có key, trả `''` → `hasApiKey` giữ nguyên `false` (đúng hành vi).
- Mọi API call thực sự đều server-side: `server/routes/generate.ts` đọc `process.env.GEMINI_API_KEY` trong Node.js context, không liên quan Vite.

**Ghi nhận:** Nếu cần test client-side key detection trong dev, dùng `VITE_API_KEY` hoặc `VITE_GEMINI_API_KEY` trong `.env.local` — path này an toàn vì VITE_ prefix chỉ inject khi developer chủ động set, không bao giờ match biến server-side như `GEMINI_API_KEY`.

---

## 7. Dependency Upgrades (Breaking)

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

## 8. TDD — validateUserInput

Tạo `server/lib/validateUserInput.ts` theo quy trình TDD:

- **RED:** viết `server/lib/validateUserInput.test.ts` (10 cases) → xác nhận fail.
- **GREEN:** tạo `validatePassword` + `validatePrompt` → 10/10 pass.
- **REFACTOR:** routes `generate.ts` và `adminUsers.ts` import từ module này thay vì inline logic.

---

## Trạng thái sau hardening (2026-06-19)

| Kiểm tra | Kết quả |
|----------|---------|
| `npm run lint` | ✅ 0 errors |
| `npm test` | ✅ 26/26 pass |
| `npm run build` | ✅ Built 8.89s |
| High severity vulnerabilities | ✅ 0 (trước: 7) |
| Moderate vulnerabilities | ⚠️ 6 (uuid trong firebase-admin transitive deps — không khai thác được trong context này) |

Tài liệu liên quan: `docs/05-security-roles.md` · `docs/03-backend-api.md` · `docs/06-live-deployment.md`
