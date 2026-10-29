# 03 - Backend & API

## Backend runtime

- `server.ts` (root) — Express 5, entry production/dev. Chạy qua `tsx --import ./server/instrument.ts` để Sentry instrument Express trước khi import (xem `docs/12-sentry-setup.md`).
- Nạp env: `.env.local` trước, rồi `.env`.
- `GET /_health` → `{"status":"ok"}` (smoke test Cloud Run; không dùng `/healthz`).
- `NODE_ENV=production`: serve static từ `dist/` + API routes.
- Dev mode: nạp Vite middleware động.
- Startup lỗi → `process.exit(1)` (Cloud Run không treo revision “healthy” giả).
- **Helmet:** Production bật CSP đầy đủ (`connect-src` whitelist Firebase/Google/GA4/OpenAI/Seedance/BytePlus/Sentry, `frame-src 'none'`, `object-src 'none'`). Dev tắt CSP để tránh conflict Vite HMR.
- **CORS:** giới hạn theo env `ALLOWED_ORIGINS` (comma-separated). Thiếu biến trên production → log `[WARN]` khi startup và **chặn mọi request cross-origin** (`origin: false`); request same-origin từ chính app vẫn chạy. Dev không set → cho phép mọi origin.
- **Payload limit:** `express.json({ limit: '10mb' })` — đủ cho base64 ảnh (~5–8 MB); vượt → `413`. Client nén ảnh ≤ 2048px và chặn payload > 9,5 MB trước khi gửi (`docs/15-generation-failures-2026-10.md`).

## Cấu trúc `server/`

```
server/
  instrument.ts                 # Sentry init (nạp qua --import)
  firebaseAdmin.ts              # Admin SDK + service-account.json (local)
  types.ts
  middleware/
    authenticate.ts             # Bearer Firebase ID token → req.user
    requireApproved.ts          # users/{uid} phải approved (hoặc role admin)
    requireAdmin.ts             # users/{uid}.role === 'admin'
  routes/
    index.ts                    # registerApiRoutes(app)
    generate.ts                 # POST /api/generate (có rate limit)
    providerTest.ts             # POST /api/provider-test (có rate limit)
    providerKeys.ts             # GET /api/provider-keys
    adminUsers.ts               # POST /api/admin/users, /api/admin/users/reset-password
  lib/
    resolveProvider.ts          # thực thi enabledProviders
    resolveGeminiModel.ts       # chọn model Gemini hợp lệ + rollback
    geminiGenerate.ts           # retry/timeout, phân loại lỗi Gemini
    geminiResponse.ts           # image config + usage
    validateBaseUrl.ts          # https + allowlist host provider
    ssrfSafeFetch.ts, ipRanges.ts  # chặn SSRF ở tầng kết nối
    providerKeys.ts             # đọc key provider từ env
    rateLimit/
      config.ts                 # RATE_LIMIT_BACKEND, 10 req/min
      memoryStore.ts
      firestoreStore.ts         # rate_limit_windows
      index.ts                  # tryConsumeRateLimit
    validateUserInput.ts        # validatePassword / validatePrompt (pure, tested)
    monthlyRollupBuilder.ts     # rebuildMonthlyAnalyticsRollup
  repositories/
    analyticsAdminRepository.ts # Admin paginate events + save rollup
```

**Dockerfile (stage production):** phải có `COPY server ./server` cùng `COPY server.ts` — thiếu thư mục `server/` → import fail, container không listen `PORT=8080`.

`server/lib/rateLimitStore.ts` — re-export deprecated; code mới import từ `server/lib/rateLimit`.

### Chuỗi middleware

| Route | Middleware |
| ----- | ---------- |
| `GET /api/provider-keys` | `authenticate` → `requireApproved` |
| `POST /api/generate` | `authenticate` → `requireApproved` → rate limit trong handler |
| `POST /api/provider-test` | `authenticate` → `requireApproved` → rate limit trong handler |
| `POST /api/admin/users*` | `authenticate` → `requireAdmin` |

`requireApproved` trả `403 account_not_approved` nếu thiếu `users/{uid}` hoặc `status` khác `approved` (admin luôn qua); không đọc được profile → `503 profile_unavailable` (fail closed).

## Database/Auth

- Firestore named database (theo `firebase-applet-config.json`).
- Firebase Auth (**email + password**, email dạng `{username}@zvas.local`) cho client.
- Firebase Admin SDK: verify ID token; tạo user (`auth.createUser`) qua API admin.
- Local dev: đặt `service-account.json` ở root hoặc `GOOGLE_APPLICATION_CREDENTIALS` (xem `docs/08-auth-users-setup.md`).

## API endpoints

### Rate limit (bên trong `/api/generate` và `/api/provider-test`)

- Route `POST /api/rate-limit` riêng **đã bị xoá** (06/2026, chống TOCTOU — `docs/10-security-hardening-2026-06.md`). Handler gọi `tryConsumeRateLimit(uid)` ngay đầu request.
- Giới hạn **10 request/phút/user** (fixed window 60s), dùng chung cho generate và provider-test. Vượt → `429`.
- Backend: `server/lib/rateLimit/` — mặc định **Firestore** trên production (multi-instance Cloud Run), **memory** khi dev.
- Env: `RATE_LIMIT_BACKEND=memory|firestore`. Firestore lỗi → **`503 rate_limit_unavailable`** (fail closed, không fallback memory).
- Collection server-only: `rate_limit_windows/{userId_windowIndex}` (Admin SDK, client bị chặn).

### `GET /api/provider-keys`

- Yêu cầu token Firebase hợp lệ + tài khoản approved.
- Trả về `{ configured: { gemini, openai, seedance, seedream } }` (boolean — key có trong env server, không lộ giá trị key).
- Client dùng để chặn nút Generate khi provider đang chọn chưa có key.

### `POST /api/admin/users`

- Yêu cầu token Firebase + `requireAdmin` (profile `users/{uid}` có `role: admin`).
- Body: `{ username, password, displayName?, role? }` — `role`: `admin` | `editor` | `advice`.
- **Password tối thiểu 12 ký tự** (validated qua `server/lib/validateUserInput.ts`).
- Tạo Auth user (`email` = `{username}@zvas.local`) + document `users/{uid}` (`status: approved`).
- Lỗi: `409` email đã tồn tại; `503` thiếu service account trên server local.

### `POST /api/admin/users/reset-password`

- Body: `{ uid, newPassword }` — admin đặt lại mật khẩu user.
- **Password tối thiểu 12 ký tự** (cùng validation như tạo user).

### `POST /api/provider-test`

- Yêu cầu token + tài khoản approved; chịu rate limit chung.
- Admin UI (`hooks/useAdminSettings.ts`) dùng để kiểm tra kết nối từng provider đang bật. Base URL Seedance/Seedream phải qua allowlist (`validateProviderBaseUrl`); key Gemini gửi qua header `x-goog-api-key`.

### `POST /api/generate`

- Yêu cầu token Firebase hợp lệ + tài khoản approved.
- Client (`services/geminiService.ts`) gửi **một request cho mỗi prompt**; input gồm `prompt`, `provider`, model, `aspectRatio`, `imageSize`, ảnh main/reference (base64).
- `provider` được `resolveProviderFromSettings` ép theo `settings/global.enabledProviders` (danh sách rỗng = không giới hạn).
- **Prompt tối đa 4000 ký tự** — vượt quá trả `400` (validated qua `server/lib/validateUserInput.ts`).
- Provider hỗ trợ: `gemini`, `openai`, `seedance`, `seedream`.
- **Gemini (image):** server chọn model qua `resolveGeminiModel` (`server/lib/resolveGeminiModel.ts`) — chỉ chấp nhận id trong `ALLOWED_GEMINI_MODEL_IDS`: **Nano Banana 2.1** `gemini-nano-banana-2.1` (mặc định), **Nano Banana Pro** `gemini-3-pro-image`, **Nano Banana 2** `gemini-3.1-flash-image` (rollback) — đều là id GA; id preview cũ từ tab/dữ liệu cũ được đổi sang id GA (`canonicalGeminiModelId`). Request Flash (2.1 hoặc 2) luôn được chuyển sang model Flash đang hoạt động theo `getAdminGeminiModel(settings)` — rollback về NB2 chỉ khi `settings/global.geminiFlashRollback === true`; id lạ/thiếu → model admin hoặc Flash đang hoạt động. `imageSize` được chuẩn hoá bằng `normalizeImageSize` (`constants/imageSizes.ts`, gọi trong `buildGeminiImageConfig`): chỉ nhận `1K`/`2K`/`4K`, giá trị khác (kể cả `512px` từ tab cũ) → `1K`. Mô tả so sánh: `docs/so-sanh-model-gemini.md`.
- Gemini có retry (tối đa 3 lần, backoff) và timeout (tổng ngân sách 240s). Lỗi trả `{ error, code }` với `code ∈ content_filter | no_output | timeout | service_unavailable | quota_exceeded | server_error` (`docs/15-generation-failures-2026-10.md`).
- Seedance/Seedream: base URL phải `https`, không trỏ nội bộ, và nằm trong allowlist host (`docs/16-provider-baseurl-allowlist-2026-10.md`); request ra ngoài qua `ssrfSafeFetch`.
- Response Gemini có thêm `thinkingTokens` (`usageMetadata.thoughtsTokenCount`) để client tính chi phí thinking (`utils/geminiPricing.ts`).
- Trả về `imageBase64` + metadata token usage.

## Quy tắc key/provider

Nguồn API key phía server (**duy nhất**):

1. Biến môi trường / Secret Manager mapping:
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`
   - `SEEDANCE_API_KEY`
   - `SEEDREAM_API_KEY` (BytePlus Seedream; model mặc định trong admin/settings, ví dụ `seedream-5-0-260128`, `seedream-4-5-251128`)
2. Không còn fallback đọc key từ Firestore `settings/global`.

`settings/global` chỉ giữ cấu hình không nhạy cảm (enabled providers, model, base URL).

## Ghi chú vận hành

- Frontend không giữ key bí mật provider.
- Backend là điểm duy nhất gọi provider trực tiếp.
- Admin UI không còn form nhập API key.
- Routes provider sẽ trả lỗi cấu hình nếu key server chưa có.

## Monthly analytics rollup (server)

- `rebuildMonthlyAnalyticsRollup(monthKey)` — quét `analytics_events` (Admin SDK), ghi `analytics_monthly_rollups/{YYYY-MM}` dùng cùng logic `services/analyticsAggregation.ts` (import từ client bundle qua Vite/TS path).
- Chưa expose HTTP công khai; dùng script nội bộ hoặc Cloud Scheduler khi cần làm mới rollup hàng tháng.

## Tests backend

```bash
npm test
```

`tsx --test` tự tìm mọi `*.test.ts` (không chạy `*.test.tsx`). Test đặt cạnh file nguồn, ví dụ:

- `server/lib/*.test.ts` — rate limit, validate input/base URL, SSRF (`ssrfSafeFetch`, `ipRanges`), resolve provider/model, Gemini retry/response.
- `server/middleware/requireApproved.test.ts`.
- `services/analyticsAggregation.test.ts`, `lib/*.test.ts`, `utils/*.test.ts`, `constants/*.test.ts`.
- `firestore.rules.test.ts` (key `settings/global` khớp rules), `scripts/dockerfileCoverage.test.ts` (Dockerfile COPY đủ thư mục server import).

## Script vận hành user

```bash
npm run provision-user -- --uid <AUTH_UID> --username <name> --role editor --status approved
```

Cần `GOOGLE_APPLICATION_CREDENTIALS` hoặc `service-account.json` tại project root.

Tài liệu auth/user: `docs/08-auth-users-setup.md` · tổng hợp refactor: `docs/07-refactor-2026-05.md`