# 06 - Live Deployment (Cloud Run)

## 1) Pre-check local

```bash
npm install
npm run lint
npm run build
npm test
```

Đảm bảo có:

- **GA4:** Measurement ID `G-W5YSHKJ7ZD` trong `index.html`; custom event chỉ gửi từ bản production — chi tiết map event: `docs/04-workflow-analytics.md`.
- `firebase.json`
- `.firebaserc`
- `firestore.indexes.json`
- `**firebase-applet-config.json**` trên máy (sao chép từ `firebase-applet-config.example.json`, **không** commit Git). File này cần cho `npm run build` (Vite) và `server.ts` (Admin `projectId` / database).

### Gói nguồn Cloud Build và `.gcloudignore`

`gcloud run deploy --source .` đóng gói theo `**.gcloudignore`** (nếu không có thì mặc định bám `**.gitignore`**). Vì `firebase-applet-config.json` nằm trong `.gitignore`, nếu không có `.gcloudignore` riêng thì file **không được upload** → Docker `COPY firebase-applet-config.json` **lỗi build**.

Repo có `**.gcloudignore`**: giống `.gitignore` nhưng **không** loại trừ `firebase-applet-config.json`, để khi deploy từ máy đã có file thì build thành công.

Image production (`Dockerfile`) phải copy `server/`, `utils/` (dùng bởi `server/routes/adminUsers.ts`), và `firebase-applet-config.json` — không chỉ `server.ts`. Thiếu một trong các path trên → container crash trước khi listen `PORT=8080`.

Deploy từ **clone sạch** (không có file): tạo `firebase-applet-config.json` trước, hoặc dùng Cloud Build + Secret Manager để ghi file trước bước `docker build` (tùy pipeline).

## 2) Deploy Firestore rules + indexes

```bash
firebase login
firebase deploy --only firestore --project zvas-ai-image
```

(hoặc `npx firebase-tools@latest ...` nếu chưa cài global)

## 3) Chọn mode deploy (quan trọng)

### Mode A — Deploy nhanh hằng ngày (không đổi cấu hình)

Dùng khi chỉ đổi code/app, **không** đổi secrets/env/IAM.

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --clear-base-image
```

Lưu ý: mode này tái sử dụng cấu hình service hiện có trên Cloud Run (secrets/env đã gắn từ revision trước).

### Mode B — Deploy có thay đổi cấu hình runtime

Dùng khi thêm/xoá/đổi provider key, xoay secret, hoặc dọn env cũ.

- Có thể dùng `--update-secrets`, `--remove-secrets`, `--remove-env-vars`.
- Đây là mode “explicit”, an toàn hơn khi thay đổi cấu hình.

### Mode C — Bootstrap môi trường mới / service mới

Dùng lần đầu tạo service hoặc môi trường clean:

1. Tạo secrets + add versions.
2. Grant IAM `secretAccessor` cho runtime service account.
3. Deploy bằng `--update-secrets=...`.

---

## 4) Secrets strategy

> Lưu ý sau hardening: API key provider **không còn nhập qua Admin UI** và **không lưu ở Firestore**. Bắt buộc cấu hình qua env/secrets của Cloud Run.

**Rate limit (multi-instance):** production mặc định `RATE_LIMIT_BACKEND=firestore` (không cần set nếu `NODE_ENV=production`). Dev local dùng memory. Tùy chọn ép: `--set-env-vars=RATE_LIMIT_BACKEND=firestore`. Khi Firestore không khả dụng, server trả **503** thay vì fallback — đảm bảo rate limit không bị bypass.

### A. Chỉ 1 key (Gemini-only)

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy=automatic --project zvas-ai-image
echo -n 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project zvas-ai-image

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --project zvas-ai-image \
  --member="serviceAccount:217522553738-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Nếu service từng có OpenAI/Seedance refs, remove trước:

```bash
gcloud run services update ai-image-zvas --region us-west1 --remove-secrets=OPENAI_API_KEY,SEEDANCE_API_KEY
gcloud run services update ai-image-zvas --region us-west1 --remove-env-vars=OPENAI_API_KEY,SEEDANCE_API_KEY
```

Deploy:

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --clear-base-image
```

### B. Nhiều key (Gemini + OpenAI + Seedance)

Thêm versions cho cả 3 secret và grant `secretAccessor` cho runtime service account.

Deploy:

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,SEEDANCE_API_KEY=SEEDANCE_API_KEY:latest \
  --clear-base-image
```

## 5) Smoke test

- **Health check:** `curl https://<service-url>/_health` → `{"status":"ok"}` (dùng `/_health`, không `/healthz` — Firebase App Hosting chặn `/healthz` ở infra level).
- Mở URL live, hard refresh.
- Vào Admin → tab Cấu hình: xác nhận không còn ô nhập API key (chỉ còn enable provider/model/base URL).
- Bấm **Kiểm tra tất cả provider đang bật** để xác nhận server đã đọc secrets/env đúng.
- Model (khi provider mặc định là Gemini): đổi dropdown Nano Banana 2 / Pro; bấm icon info — popup so sánh từ `docs/so-sanh-model-gemini.md` hiển thị đủ, đóng bằng X / nền / Escape.
- Login Google.
- Generate ảnh.
- Kiểm tra Analytics:
  - Chọn tháng, bấm **Yêu cầu dữ liệu** để tải KPI/breakdown/trends.
  - Xác nhận đổi tháng không tự gọi read cho đến khi bấm lại nút.
  - Trong bảng số ảnh theo user: ưu tiên dữ liệu `stats_by_user_month/{YYYY-MM}`; nếu thiếu thì chỉ quét history khi bấm **Cập nhật số ảnh**.
- Kiểm tra role `advice` chỉ thấy Analytics.

## 6) Logs và rollback

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-image-zvas"' \
  --project zvas-ai-image \
  --limit 100 \
  --format="value(textPayload)"

gcloud run revisions list --service ai-image-zvas --region us-west1
gcloud run services update-traffic ai-image-zvas --region us-west1 --to-revisions=REVISION_NAME=100
```

## 7) Decision matrix nhanh


| Tình huống                         | Lệnh nên dùng                            |
| ---------------------------------- | ---------------------------------------- |
| Chỉ đổi code/UI/API nội bộ         | **Mode A** (deploy nhanh)                |
| Đổi key provider / biến môi trường | **Mode B** (deploy explicit secrets/env) |
| Dựng môi trường mới hoàn toàn      | **Mode C** (bootstrap đầy đủ)            |


## 8) Checklist trước khi bấm deploy

- `firebase-applet-config.json` tồn tại trong working tree (không commit).
- Firestore rules/indexes đã deploy đúng project/database.
- Secrets mới đã có version và IAM đúng.
- **`ALLOWED_ORIGINS` đã set đúng domain production** — thiếu → CORS fail closed (`origin: false`), browser không gọi được API dù app vẫn khởi động.
- Chọn đúng mode (A/B/C) theo thay đổi của phiên deploy.
- `npm test` pass (26 tests: aggregation + rate limit + validateUserInput + generation prompts).

## 9) Troubleshooting — Revision không ready (PORT 8080)

**Triệu chứng:** `The user-provided container failed to start and listen on the port defined by PORT=8080`.

**Nguyên nhân thường gặp:**

1. Dockerfile thiếu `COPY server ./server` → `Cannot find module './server/routes'` khi chạy `tsx server.ts`.
2. Dockerfile thiếu `COPY utils ./utils` → `ERR_MODULE_NOT_FOUND: .../utils/authCredentials` (import từ `server/routes/adminUsers.ts`).
3. `firebase-applet-config.json` thiếu trong image build context.
3. Lỗi runtime khác trước `app.listen` — xem log revision:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-image-zvas"' \
  --project zvas-ai-image \
  --limit 50 \
  --format="value(textPayload)"
```

**Sửa:** đảm bảo Dockerfile production stage có:

```dockerfile
COPY server.ts firebase-applet-config.json ./
COPY server ./server
COPY utils ./utils
```

Redeploy Mode A sau khi sửa.

## 10) Console / GA4 (không chặn deploy)

- `ERR_BLOCKED_BY_CLIENT` trên Google Tag Manager: extension chặn analytics — bỏ qua khi smoke test chức năng app.
- Warning Firestore `enableMultiTabIndexedDbPersistence`: bản build mới dùng `initializeFirestore` + `localCache` (`firebase.ts`).

Tài liệu đầy đủ thay đổi: `docs/07-refactor-2026-05.md`

