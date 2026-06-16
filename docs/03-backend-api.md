# 03 - Backend & API

## Backend runtime

- `server.ts` (root) — Express 5, entry production/dev.
- `NODE_ENV=production`: serve static từ `dist/` + API routes.
- Dev mode: nạp Vite middleware động.
- Startup lỗi → `process.exit(1)` (Cloud Run không treo revision “healthy” giả).
- **Helmet:** Production bật CSP đầy đủ (`connect-src` whitelist Firebase/Google/OpenAI/Seedance, `frame-src 'none'`, `object-src 'none'`). Dev tắt CSP để tránh conflict Vite HMR.
- **CORS:** giới hạn theo env `ALLOWED_ORIGINS` (comma-separated). Thiếu biến trên production → log `[WARN]` khi startup (không block, nhưng cần set trước khi go-live).
- **Payload limit:** `express.json({ limit: '10mb' })` — đủ cho base64 ảnh (~5–8 MB).

## Cấu trúc `server/`

```
server/
  firebaseAdmin.ts              # Admin SDK + service-account.json (local)
  types.ts
  middleware/authenticate.ts    # Bearer Firebase ID token
  routes/
    index.ts                    # registerApiRoutes(app)
    rateLimit.ts                # POST /api/rate-limit (async)
    generate.ts                 # POST /api/generate
    providerTest.ts             # POST /api/provider-test (admin)
  lib/
    resolveProvider.ts
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

## Database/Auth

- Firestore named database (theo `firebase-applet-config.json`).
- Firebase Auth (**email + password**, email dạng `{username}@zvas.local`) cho client.
- Firebase Admin SDK: verify ID token; tạo user (`auth.createUser`) qua API admin.
- Local dev: đặt `service-account.json` ở root hoặc `GOOGLE_APPLICATION_CREDENTIALS` (xem `docs/08-auth-users-setup.md`).

## API endpoints

### `POST /api/rate-limit`

- Yêu cầu `Authorization: Bearer <Firebase ID token>`.
- Giới hạn **10 request/phút/user** (fixed window 60s).
- Backend: `server/lib/rateLimit/` — mặc định **Firestore** trên production (multi-instance Cloud Run), **memory** khi dev.
- Env: `RATE_LIMIT_BACKEND=memory|firestore` (nếu Firestore lỗi → fallback memory + log).
- Collection server-only: `rate_limit_windows/{userId_windowIndex}` (Admin SDK, không expose client write).

### `GET /api/provider-keys`

- Yêu cầu token Firebase hợp lệ.
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

### `POST /api/generate`

- Yêu cầu token Firebase hợp lệ.
- Input gồm `prompt`, model/provider, ảnh main/reference (base64).
- **Prompt tối đa 4000 ký tự** — vượt quá trả `400` (validated qua `server/lib/validateUserInput.ts`).
- Provider hỗ trợ: `gemini`, `openai`, `seedance`, `seedream`.
- **Gemini (image):** id model trên client/admin nên khớp bộ cho phép trong `constants/aiModels.ts` — hiện **Nano Banana Pro** `gemini-3-pro-image-preview`, **Nano Banana 2** `gemini-3.1-flash-image-preview` (mô tả so sánh: `docs/so-sanh-model-gemini.md`).
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

- `server/lib/rateLimit/rateLimit.test.ts` — memory + Firestore store (mock).
- `server/lib/validateUserInput.test.ts` — validatePassword (5 cases) + validatePrompt (5 cases).
- `services/analyticsAggregation.test.ts` — pure aggregation.

## Script vận hành user

```bash
npm run provision-user -- --uid <AUTH_UID> --username <name> --role editor --status approved
```

Cần `GOOGLE_APPLICATION_CREDENTIALS` hoặc `service-account.json` tại project root.

Tài liệu auth/user: `docs/08-auth-users-setup.md` · tổng hợp refactor: `docs/07-refactor-2026-05.md`