# 06 - Live Deployment (Cloud Run)

## 1) Pre-check local

```bash
npm install
npm run lint
npm run build
```

Đảm bảo có:

- `firebase.json`
- `.firebaserc`
- `firestore.indexes.json`
- **`firebase-applet-config.json`** trên máy (sao chép từ `firebase-applet-config.example.json`, **không** commit Git). File này cần cho `npm run build` (Vite) và `server.ts` (Admin `projectId` / database).

### Gói nguồn Cloud Build và `.gcloudignore`

`gcloud run deploy --source .` đóng gói theo **`.gcloudignore`** (nếu không có thì mặc định bám **`.gitignore`**). Vì `firebase-applet-config.json` nằm trong `.gitignore`, nếu không có `.gcloudignore` riêng thì file **không được upload** → Docker `COPY firebase-applet-config.json` **lỗi build**.

Repo có **`.gcloudignore`**: giống `.gitignore` nhưng **không** loại trừ `firebase-applet-config.json`, để khi deploy từ máy đã có file thì build thành công.

Deploy từ **clone sạch** (không có file): tạo `firebase-applet-config.json` trước, hoặc dùng Cloud Build + Secret Manager để ghi file trước bước `docker build` (tùy pipeline).

## 2) Deploy Firestore rules + indexes

```bash
firebase login
firebase deploy --only firestore --project zvas-ai-image
```

(hoặc `npx firebase-tools@latest ...` nếu chưa cài global)

## 3) Secrets strategy

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

## 4) Smoke test

- Mở URL live, hard refresh.
- Login Google.
- Generate ảnh.
- Kiểm tra Analytics (KPI tháng + bảng số ảnh theo tháng).
- Kiểm tra role `advice` chỉ thấy Analytics.

## 5) Logs và rollback

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-image-zvas"' \
  --project zvas-ai-image \
  --limit 100 \
  --format="value(textPayload)"

gcloud run revisions list --service ai-image-zvas --region us-west1
gcloud run services update-traffic ai-image-zvas --region us-west1 --to-revisions=REVISION_NAME=100
```

