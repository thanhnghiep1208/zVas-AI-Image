# Release Checklist (Production)

## 0) Pre-check

- Confirm active project/service:
  - Project: `zvas-ai-image`
  - Region: `us-west1`
  - Service: `ai-image-zvas`
- Ensure local checks pass:
  - `npm run lint`
  - `npm run build`
  - `npm test` (analytics aggregation + rate limit)
- Repo đã có `firebase.json` + `.firebaserc` + `firestore.indexes.json` — chạy lệnh Firebase từ **thư mục gốc** dự án (`zvas-ai-image`).

---

## 0.5) Deploy Firestore rules (sau khi sửa `firestore.rules`)

Đăng nhập CLI (một lần): `firebase login`

Từ thư mục chứa `firebase.json`:

```bash
firebase deploy --only firestore:rules --project zvas-ai-image
```

Hoặc không cài global: `npx firebase-tools@latest deploy --only firestore:rules --project zvas-ai-image`

Rules được gắn với database id trong `firebase.json` (trùng `firestoreDatabaseId` trong `firebase-applet-config.json`).

Sau refactor 05/2026: deploy rules nếu có thay đổi `rate_limit_windows` (client deny all).

---

## 1) Secrets (Secret Manager)

Enable API (one-time):

```bash
gcloud services enable secretmanager.googleapis.com --project zvas-ai-image
```

Create or rotate secrets:

```bash
echo -n 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project zvas-ai-image
echo -n 'YOUR_OPENAI_API_KEY' | gcloud secrets versions add OPENAI_API_KEY --data-file=- --project zvas-ai-image
echo -n 'YOUR_SEEDANCE_API_KEY' | gcloud secrets versions add SEEDANCE_API_KEY --data-file=- --project zvas-ai-image
```

If secret does not exist yet, use `gcloud secrets create ...` first.

---

## 2) Grant Secret Access to Cloud Run Service Account

Runtime service account (example in this project):

- `217522553738-compute@developer.gserviceaccount.com`

Grant accessor role:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --project zvas-ai-image \
  --member="serviceAccount:217522553738-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --project zvas-ai-image \
  --member="serviceAccount:217522553738-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SEEDANCE_API_KEY \
  --project zvas-ai-image \
  --member="serviceAccount:217522553738-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3) Attach Secrets to Cloud Run Env

If an env var was previously plaintext, remove it first:

```bash
gcloud run services update ai-image-zvas \
  --region us-west1 \
  --remove-env-vars=GEMINI_API_KEY,OPENAI_API_KEY,SEEDANCE_API_KEY
```

Attach secret-backed env vars:

```bash
gcloud run services update ai-image-zvas \
  --region us-west1 \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,SEEDANCE_API_KEY=SEEDANCE_API_KEY:latest
```

Verify env source is secret refs:

```bash
gcloud run services describe ai-image-zvas \
  --region us-west1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

---

## 4) Deploy to Live Service

Build từ **Dockerfile** (`--source .`). Nếu trước đây service từng dùng buildpack / base image khác, lần deploy này cần xóa base image đã lưu — nếu không gcloud báo `Missing required argument [--clear-base-image]`:

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --clear-base-image
```

Chỉ cần `--clear-base-image` **một lần** khi chuyển sang Dockerfile; deploy sau vẫn có thể giữ flag (an toàn) hoặc bỏ nếu không còn cảnh báo.

**Dockerfile:** phải copy `server/` (không chỉ `server.ts`). Thiếu → Cloud Run báo container không listen PORT 8080. Xem `docs/06-live-deployment.md` §9.

Production rate limit: mặc định Firestore backend (`RATE_LIMIT_BACKEND=firestore` khi `NODE_ENV=production`). Tùy chọn: `--set-env-vars=RATE_LIMIT_BACKEND=firestore`.

Confirm URL:

```bash
gcloud run services describe ai-image-zvas \
  --region us-west1 \
  --format="value(status.url)"
```

---

## 5) Smoke Test (Required)

- Open live URL and hard refresh.
- Login with Google.
- Generate image with:
  - default model
  - switched model on header
- Open Admin Analytics:
  - Chọn tháng → bấm **Yêu cầu dữ liệu** → KPI / token / model / trends
  - (Tuỳ chọn) Generate >10 lần/phút → 429 rate limit trên prod
- Confirm non-admin user can access tool (approved status).
- GA4 `ERR_BLOCKED_BY_CLIENT` trong console = ad blocker, không fail release.

---

## 6) Post-release Monitoring

Check Cloud Run logs for `/api/generate`, auth errors, and provider errors:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-image-zvas"' \
  --project zvas-ai-image \
  --limit 100 \
  --format="value(textPayload)"
```

Watch for spikes in:

- 401/403 (auth/permission)
- 429 (rate-limit/quota)
- 5xx (provider/API errors)

---

## 7) Rollback (if needed)

List revisions:

```bash
gcloud run revisions list --service ai-image-zvas --region us-west1
```

Shift traffic back to previous stable revision:

```bash
gcloud run services update-traffic ai-image-zvas \
  --region us-west1 \
  --to-revisions=REVISION_NAME=100
```

