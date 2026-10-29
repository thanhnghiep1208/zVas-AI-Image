# 06 - Live Deployment (Cloud Run)

## 0) Deploy tự động bằng GitHub Actions (mặc định từ 10/2026)

**Flow:** mở PR vào `main` → job `check` (lint, test, build) phải pass → merge → workflow `.github/workflows/deploy.yml` build Docker image, push Artifact Registry (tag = commit SHA), `gcloud run deploy --image` rồi smoke test `/_health`. Không còn chạy `gcloud run deploy --source .` từ máy cho release thường.

- Deploy bằng image **giữ nguyên** env/secrets/IAM đã gắn trên service (giống Mode A). Đổi secrets/env vẫn làm tay theo Mode B (§3), sau đó push code như bình thường.
- `firebase-applet-config.json` không có trong Git → workflow ghi lại từ secret `FIREBASE_APPLET_CONFIG`.
- Xác thực GCP bằng Workload Identity Federation (OIDC), **không** có service account key. Provider chỉ chấp nhận token từ repo `thanhnghiep1208/zVas-AI-Image`, ref `refs/heads/main`.
- Chạy tay: tab Actions → **Deploy** → *Run workflow* (chọn branch `main`).
- Firestore rules/indexes **không** deploy tự động — vẫn chạy tay theo §2 (trước khi merge nếu rules có field mới).
- Rollback: chuyển traffic về revision cũ (§6), hoặc *Re-run* workflow của commit cũ trên tab Actions.
- Không deploy từ Google AI Studio nữa — xem §9.1 (sidecar AI Studio làm CI lỗi `PERMISSION_DENIED`).

### Setup một lần

1. Owner project chạy (idempotent, chạy lại an toàn):

   ```bash
   bash scripts/setup-github-deploy.sh
   ```

   Script tạo Artifact Registry `us-west1/app`, service account `github-deployer` (`roles/run.admin`, `roles/artifactregistry.writer` trên repo, `roles/iam.serviceAccountUser` trên runtime SA `…-compute@developer`), WIF pool `github` + provider `github-oidc`, rồi in lệnh `gh` để set secrets/variables.

2. GitHub repo → Settings → Secrets and variables → Actions:

   | Loại     | Tên                      | Giá trị                                              |
   | -------- | ------------------------ | ---------------------------------------------------- |
   | Secret   | `WIF_PROVIDER`           | `projects/<number>/locations/global/workloadIdentityPools/github/providers/github-oidc` |
   | Secret   | `WIF_SERVICE_ACCOUNT`    | `github-deployer@zvas-ai-image.iam.gserviceaccount.com` |
   | Secret   | `FIREBASE_APPLET_CONFIG` | Nội dung `firebase-applet-config.json`               |
   | Secret   | `VITE_SENTRY_DSN`        | (tuỳ chọn) DSN Sentry frontend                       |
   | Variable | `GCP_PROJECT`            | `zvas-ai-image`                                      |
   | Variable | `GCP_REGION`             | `us-west1`                                           |
   | Variable | `CLOUD_RUN_SERVICE`      | `ai-image-zvas`                                      |
   | Variable | `AR_REPO`                | `app`                                                |

3. Tạo Environment `production` (Settings → Environments). Muốn duyệt tay trước khi deploy → bật *Required reviewers*.
4. Branch `main` được bảo vệ bằng ruleset **Protect main** (Settings → Rules → Rulesets, bật 10/2026) — xem mục dưới.

### Bảo vệ branch `main` (ruleset "Protect main")

Mỗi commit lên `main` = một lần deploy prod, nên `main` có các rule:

| Rule                              | Ý nghĩa                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| Chặn xoá branch                   | Không xoá được `main`                                                   |
| Chặn force push                   | Giữ lịch sử, tránh deploy nhầm trạng thái đã ghi đè                      |
| Bắt buộc merge qua PR             | 0 approval (repo một người — không tự approve PR của mình được)          |
| Bắt buộc status check `check`     | Chỉ chấp nhận kết quả từ GitHub Actions; lint/test/build fail → không merge |
| Bypass: role Admin                | Lối thoát khi hotfix khẩn cấp — push thẳng vẫn được nhưng bị ghi nhận bypass |

**Flow hằng ngày:** tạo branch → push → mở PR → chờ `check` xanh → merge → workflow tự deploy. Không push thẳng `main` trừ khi khẩn cấp.

Đổi tên job `check` trong `deploy.yml` → phải sửa tên status check trong ruleset, nếu không mọi PR sẽ kẹt chờ check không bao giờ chạy.

Xem/kiểm tra rule đang áp:

```bash
gh api repos/thanhnghiep1208/zVas-AI-Image/rules/branches/main --jq '.[].type'
```

Đổi nội dung `firebase-applet-config.json` → cập nhật lại secret `FIREBASE_APPLET_CONFIG`.

Deploy tay bằng `gcloud` (các mục dưới) vẫn dùng được làm phương án dự phòng khi GitHub Actions lỗi.

## 1) Pre-check local (dùng cho deploy tay)

CI đã chạy đủ các bước này cho mọi PR; chạy tay khi deploy dự phòng hoặc muốn kiểm tra trước khi push.

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

Image production (`Dockerfile`) phải copy `server/`, `utils/` (dùng bởi `server/routes/adminUsers.ts`), `constants/` (dùng bởi `server/routes/generate.ts`, `server/lib/resolveGeminiModel.ts` — `constants/aiModels.ts`), và `firebase-applet-config.json` — không chỉ `server.ts`. **Khi server import thêm thư mục top-level mới, phải thêm `COPY` tương ứng.** Thiếu một trong các path trên → container crash trước khi listen `PORT=8080`.

Deploy từ **clone sạch** (không có file): tạo `firebase-applet-config.json` trước, hoặc dùng Cloud Build + Secret Manager để ghi file trước bước `docker build` (tùy pipeline).

## 2) Deploy Firestore rules + indexes

```bash
firebase login
firebase deploy --only firestore --project zvas-ai-image
# hoặc chỉ rules:
firebase deploy --only firestore:rules --project zvas-ai-image
```

(hoặc `npx firebase-tools@latest ...` nếu chưa cài global)

- Gõ đúng `firestore:rules` (có **s**). `firebase.json` khai báo Firestore dạng mảng theo database, nên `firestore:rule` bị hiểu là tên database → lỗi `Could not find configurations in firebase.json for the following database targets: rule`.
- **Deploy rules trước app** khi rules thêm field mới cho `settings/global` (vd. `geminiFlashRollback`, 10/2026). `isSafeGlobalSettings()` dùng `keys().hasOnly([...])`: nếu app mới ghi field mà rules cũ chưa có → Admin **không lưu được** Settings.

### gcloud báo Python 3.9 không còn hỗ trợ

`ERROR: gcloud failed to load. You are running gcloud with Python 3.9` → trỏ gcloud sang Python 3.10–3.14 (Homebrew):

```bash
echo 'export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.14' >> ~/.zshrc
source ~/.zshrc
gcloud --version
```

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

### B. Nhiều key (Gemini + OpenAI + Seedance + Seedream)

Thêm versions cho từng secret cần dùng và grant `secretAccessor` cho runtime service account.

Deploy:

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,SEEDANCE_API_KEY=SEEDANCE_API_KEY:latest,SEEDREAM_API_KEY=SEEDREAM_API_KEY:latest \
  --clear-base-image
```

Chỉ gắn secret của provider thực sự bật — key thiếu thì `GET /api/provider-keys` báo `false` và UI chặn nút Generate cho provider đó.

## 5) Smoke test

- **Health check:** `curl https://<service-url>/_health` → `{"status":"ok"}` (dùng `/_health`, không `/healthz` — Firebase App Hosting chặn `/healthz` ở infra level).
- Mở URL live, hard refresh.
- Vào Admin → tab Cấu hình: xác nhận không còn ô nhập API key (chỉ còn enable provider/model/base URL).
- Bấm **Kiểm tra tất cả provider đang bật** để xác nhận server đã đọc secrets/env đúng.
- Model (khi provider mặc định là Gemini): đổi dropdown Nano Banana 2.1 / Pro; bấm icon info — popup so sánh từ `docs/so-sanh-model-gemini.md` hiển thị đủ, đóng bằng X / nền / Escape.
- Đăng nhập bằng username/mật khẩu (`{username}@zvas.local`).
- Generate ảnh.
- Kiểm tra Analytics:
  - Chọn tháng, bấm **Yêu cầu dữ liệu** để tải KPI/breakdown/trends.
  - Xác nhận đổi tháng không tự gọi read cho đến khi bấm lại nút.
  - Trong bảng số ảnh theo user: cột số ảnh hiện `—` cho tới khi bấm **Cập nhật số ảnh** (quét `analytics_events` của tháng).
- Kiểm tra role `advice` chỉ thấy Analytics.

### Rollback Nano Banana 2.1 → Nano Banana 2

Dùng khi Nano Banana 2.1 lỗi hoặc chất lượng kém. Không cần deploy.

1. Vào Admin → tab Cấu hình → khối **Gemini** → dropdown **Model**, chọn `Nano Banana 2 (cũ – dùng để rollback)`, bấm lưu. Lưu sẽ ghi `settings/global.geminiFlashRollback = true`; chỉ cờ này mới bật rollback — dữ liệu cũ có `geminiModel = gemini-3.1-flash-image-preview` (hoặc `gemini-3.1-flash-image`) mà không có cờ được coi là 2.1 (`getAdminGeminiModel`). Yêu cầu Firestore rules đã deploy có key `geminiFlashRollback` (`firebase deploy --only firestore:rules`).
2. Kiểm tra: reload app bằng tài khoản user → dropdown header hiện `GEMINI · Nano Banana 2` (không còn 2.1). Tạo một ảnh, log server/Analytics ghi model `gemini-3.1-flash-image`. Tab mở sẵn còn gửi `gemini-nano-banana-2.1` cũng được server chuyển sang Nano Banana 2.
3. Bật lại 2.1: chọn `Nano Banana 2.1 (mặc định)` (hoặc `Nano Banana Pro`) rồi lưu; user reload sẽ thấy lại Nano Banana 2.1.

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
- Firestore rules/indexes đã deploy đúng project/database (**trước** app nếu rules có field mới).
- Dockerfile production `COPY` đủ mọi thư mục top-level mà `server/` import (`server`, `utils`, `constants`).
- Secrets mới đã có version và IAM đúng.
- **`ALLOWED_ORIGINS` đã set đúng domain production** — thiếu → CORS fail closed (`origin: false`): mọi request cross-origin (domain khác gọi API) bị chặn; app same-origin vẫn chạy nhưng log `[WARN]` mỗi lần khởi động.
- Chọn đúng mode (A/B/C) theo thay đổi của phiên deploy.
- `npm test` pass (gồm `firestore.rules.test.ts` (key `settings/global` khớp rules) và `scripts/dockerfileCoverage.test.ts` (Dockerfile COPY đủ thư mục server nạp)). **Lưu ý:** `tsx --test` chỉ tự tìm `*.test.ts` — **không** chạy `*.test.tsx`; test component viết dạng `.test.ts` với `React.createElement`.

## 9) Troubleshooting — Revision không ready (PORT 8080)

**Triệu chứng:** `The user-provided container failed to start and listen on the port defined by PORT=8080`.

**Nguyên nhân thường gặp:**

1. Dockerfile thiếu `COPY server ./server` → `Cannot find module './server/routes'` khi chạy `tsx server.ts`.
2. Dockerfile thiếu `COPY utils ./utils` → `ERR_MODULE_NOT_FOUND: .../utils/authCredentials` (import từ `server/routes/adminUsers.ts`).
3. Dockerfile thiếu `COPY constants ./constants` → `ERR_MODULE_NOT_FOUND: Cannot find module '/app/constants/aiModels' imported from /app/server/routes/generate.ts` (gặp 10/2026 khi nâng Nano Banana 2.1).
4. `firebase-applet-config.json` thiếu trong image build context.
5. Lỗi runtime khác trước `app.listen` — xem log revision:

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
COPY constants ./constants
```

Kiểm tra nhanh trước khi deploy: chỉ copy đúng các path trên vào một thư mục tạm (symlink `node_modules`), chạy `PORT=8099 NODE_ENV=production npx tsx server.ts` rồi `curl localhost:8099/_health` → phải trả `{"status":"ok"}`.

Redeploy Mode A sau khi sửa.

## 9.1) Troubleshooting — CI deploy lỗi bucket `ai-studio-bucket-…` (sidecar AI Studio)

**Triệu chứng:** job `deploy` build/push image xong nhưng bước `gcloud run deploy --image` lỗi:

```
PERMISSION_DENIED: The source bucket ai-studio-bucket-217522553738-us-west1 must be in the same project as the service and has the used-by=cloudrun label...
```

**Nguyên nhân:** service ban đầu do Google AI Studio tạo (label `managed-by: google-ai-studio`) dưới dạng **multi-container**:

- `nginx-container` (port 8080) — container mà mọi lần deploy (kể cả `--source .`) thay image, chạy app thật + gắn secrets.
- `app-container` (sidecar, `image: scratch`) — chạy code "version-1" của AI Studio từ bucket trên, qua annotation `run.googleapis.com/sources` + `run.googleapis.com/base-images` và `runtimeClassName: run.googleapis.com/linux-base-image-update`. App hiện tại không dùng, nhưng mỗi revision mới vẫn kéo theo → SA `github-deployer` không đọc được bucket nên bị từ chối. Deploy tay không lỗi vì tài khoản Owner có quyền bucket.

`--clear-base-image` **không** gỡ được các annotation này. Đã sửa 10/2026 (revision `00079`) bằng cách chuyển service về **một container**:

```bash
gcloud run services describe ai-image-zvas --region us-west1 --format=export > service.yaml
# Xoá trong spec.template: container app-container, annotation run.googleapis.com/sources,
# run.googleapis.com/base-images, run.googleapis.com/container-dependencies, runtimeClassName,
# label client.knative.dev/nonce. Nâng nginx-container lên cpu '1' (concurrency > 1 cần ≥ 1 vCPU).
gcloud run services replace service.yaml --region us-west1 --project zvas-ai-image
```

**Phòng tránh:** **không** deploy lại từ AI Studio — có thể dựng lại sidecar và làm CI lỗi lại. Kiểm tra nhanh:

```bash
gcloud run services describe ai-image-zvas --region us-west1 --format=json | grep -E "run.googleapis.com/(sources|base-images)|app-container"
```

Không in gì = sạch. Revision ≤ `00078` vẫn còn sidecar — rollback về đó thì deploy CI kế tiếp sẽ lỗi lại cho tới khi `replace` như trên.

## 10) Console / GA4 (không chặn deploy)

- `ERR_BLOCKED_BY_CLIENT` trên Google Tag Manager: extension chặn analytics — bỏ qua khi smoke test chức năng app.
- Warning Firestore `enableMultiTabIndexedDbPersistence`: bản build mới dùng `initializeFirestore` + `localCache` (`firebase.ts`).

Tài liệu đầy đủ thay đổi: `docs/07-refactor-2026-05.md`

