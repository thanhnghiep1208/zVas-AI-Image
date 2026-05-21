# 03 - Backend & API

## Backend runtime

- `server.ts` (root) — Express 5, entry production/dev.
- `NODE_ENV=production`: serve static từ `dist/` + API routes.
- Dev mode: nạp Vite middleware động.
- Startup lỗi → `process.exit(1)` (Cloud Run không treo revision “healthy” giả).

## Cấu trúc `server/`

```
server/
  firebaseAdmin.ts              # Admin SDK, named Firestore DB
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
    monthlyRollupBuilder.ts     # rebuildMonthlyAnalyticsRollup
  repositories/
    analyticsAdminRepository.ts # Admin paginate events + save rollup
```

**Dockerfile (stage production):** phải có `COPY server ./server` cùng `COPY server.ts` — thiếu thư mục `server/` → import fail, container không listen `PORT=8080`.

`server/lib/rateLimitStore.ts` — re-export deprecated; code mới import từ `server/lib/rateLimit`.

## Database/Auth

- Firestore named database (theo `firebase-applet-config.json`).
- Firebase Auth (Google sign-in) cho client.
- Firebase Admin SDK verify ID token ở backend.

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

### `POST /api/generate`

- Yêu cầu token Firebase hợp lệ.
- Input gồm `prompt`, model/provider, ảnh main/reference (base64).
- Provider hỗ trợ: `gemini`, `openai`, `seedance`, `seedream`.
- **Gemini (image):** id model trên client/admin nên khớp bộ cho phép trong `constants/aiModels.ts` — hiện **Nano Banana Pro** `gemini-3-pro-image-preview`, **Nano Banana 2** `gemini-3.1-flash-image-preview` (mô tả so sánh: `docs/so-sanh-model-gemini.md`).
- Trả về `imageBase64` + metadata token usage.

## Quy tắc key/provider

Nguồn API key phía server (**duy nhất**):

1. Biến môi trường / Secret Manager mapping:
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`
   - `SEEDANCE_API_KEY`
   - `SEEDREAM_API_KEY`
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
- `services/analyticsAggregation.test.ts` — pure aggregation.

Tài liệu tổng hợp: `docs/07-refactor-2026-05.md`