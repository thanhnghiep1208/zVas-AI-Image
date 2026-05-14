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
- `**firebase-applet-config.json**` trên máy (sao chép từ `firebase-applet-config.example.json`, **không** commit Git). File này cần cho `npm run build` (Vite) và `server.ts` (Admin `projectId` / database).

### Gói nguồn Cloud Build và `.gcloudignore`

`gcloud run deploy --source .` đóng gói theo `**.gcloudignore`** (nếu không có thì mặc định bám `**.gitignore`**). Vì `firebase-applet-config.json` nằm trong `.gitignore`, nếu không có `.gcloudignore` riêng thì file **không được upload** → Docker `COPY firebase-applet-config.json` **lỗi build**.

Repo có `**.gcloudignore`**: giống `.gitignore` nhưng **không** loại trừ `firebase-applet-config.json`, để khi deploy từ máy đã có file thì build thành công.

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

- Mở URL live, hard refresh.
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
- Chọn đúng mode (A/B/C) theo thay đổi của phiên deploy.

