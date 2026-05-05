# Tài Liệu Tổng Quan Dự Án AI Image ZVAS

Dự án này là một ứng dụng web hiện đại cho phép người dùng tạo hình ảnh bằng AI (Gemini, OpenAI, Seedance) với nhiều tùy chọn phong cách, quản lý lịch sử và hệ thống Admin toàn diện.

---

## 1. Tổng Quan (Overview)

- **Tên ứng dụng**: AI Image ZVAS
- **Mục tiêu**: Cung cấp công cụ tạo ảnh AI chuyên nghiệp dành cho người dùng cá nhân và doanh nghiệp.
- **Tính năng chính**:
  - Tạo ảnh từ văn bản (Text-to-Image).
  - Chỉnh sửa ảnh từ ảnh gốc (Image-to-Image).
  - Trộn ảnh (Merge Image).
  - Tạo nhiều biến thể cùng lúc.
  - Quản lý lịch sử tạo ảnh cá nhân.
  - Bảng điều khiển Admin để quản lý người dùng và cấu hình API.

---

## 2. Kiến Trúc Frontend

Sử dụng các công nghệ hiện đại nhất để đảm bảo hiệu năng và trải nghiệm người dùng mượt mà.

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/).
- **Công cụ xây dựng**: [Vite 6](https://vitejs.dev/).
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) (tiếp cận Utility-first, giao diện tối ưu cho Dark Mode).
- **Icons**: [Lucide React](https://lucide.dev/).
- **Thông báo**: [Sonner](https://sonner.steventey.com/).
- **Lưu trữ local**: [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB để lưu blob ảnh lớn theo ID document lịch sử).

### 2.1. Cấu trúc thư mục (frontend, rút gọn)


| Đường dẫn             | Mô tả                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`             | Điều phối: điều kiện auth, ghép hooks, chọn view (Create / Merge / Multiple), overlay (Style Guide, Fullscreen, Admin). |
| `index.tsx`           | Entry React; bọc `ErrorBoundary`.                                                                                       |
| `components/`         | UI tái sử dụng (upload, prompt, kết quả, merge, multiple, admin, …).                                                    |
| `components/layout/`  | `AuthLoadingScreen`, `AppHeader`, `AppFooter`.                                                                          |
| `components/landing/` | `LandingPage` (chưa đăng nhập).                                                                                         |
| `components/guards/`  | `RejectedAccessScreen` (tài khoản bị từ chối).                                                                          |
| `components/views/`   | `CreateView` (toàn bộ màn Create).                                                                                      |
| `hooks/`              | Logic tách khỏi `App`: auth, settings, history, generation, download, pending users.                                    |
| `lib/`                | `buildGenerationPrompts.ts`: ghép prompt cuối + `buildEffectiveSettings` cho model theo provider.                       |
| `constants/`          | `aiModels.ts`, `promptModifiers.ts` (map style/nền).                                                                    |
| `services/`           | `geminiService.ts` (gọi `/api/*`), `analyticsService.ts`.                                                               |
| `utils/`              | `imageDataUrl`, `aspectRatio`, `runtimeEnv`.                                                                            |


### 2.2. Custom hooks (`hooks/`)

- **useAuthAndProfile**: Firebase Auth + snapshot `users/{uid}`; `onSignedOut` gọi `resetAppState` từ App; `handleLogin` / `handleLogout`.
- **useGlobalSettingsAndApiKey**: Cache `sessionStorage`, kiểm tra AI Studio / env, `onSnapshot(settings/global)` khi đã đăng nhập; `getProviderKey`, `getEffectiveModel`, `handleSelectApiKey`.
- **useHistoryImages**: Đọc `history` + ảnh từ IndexedDB; xóa lịch sử; đồng bộ khi `user` thay đổi (logout → danh sách rỗng).
- **usePendingUsersNotifier**: Admin lắng nghe user `pending`, badge + toast (mở dashboard).
- **useImageGeneration**: Trạng thái `isLoading` / `generatedImages`; `handleGenerateClick` (prompt pipeline, gọi API, analytics, ghi Firestore + IDB, cập nhật history optimistically); khi `user === null` xóa state generation.
- **useGeneratedImageDownload**: Xuất PNG/JPG và tùy chọn xóa nền client-side.

### 2.3. Entry & shell dev/prod

- `**npm run dev`**: `tsx server.ts` — Express + Vite middleware (HMR).
- `**npm run build`**: output `dist/`; `**npm start`**: Express phục vụ `dist` + API.

### 2.4. Sơ đồ kiến trúc (Mermaid)

**Tổng thể: trình duyệt, server, Firebase và nhà cung cấp AI**

```mermaid
flowchart LR
  subgraph browser [Trình duyệt — React]
    App[App.tsx]
    Hooks[hooks: auth settings history generation …]
    App --> Hooks
  end

  subgraph server [Node — server.ts]
    API["/api/rate-limit<br/>/api/generate"]
    Vite[Vite static / dist]
  end

  subgraph firebase [Firebase]
    AuthSvc[Auth]
    FS[(Firestore)]
  end

  subgraph providers [Nhà cung cấp AI]
    Gemini[Gemini]
    OAI[OpenAI]
    SD[Seedance]
  end

  browser -->|Bearer ID token + JSON| API
  API --> AuthSvc
  API --> FS
  API --> Gemini
  API --> OAI
  API --> SD
  server -->|production| Vite
```



**Luồng tạo ảnh (một prompt)**

```mermaid
sequenceDiagram
  participant U as Người dùng
  participant App as App / useImageGeneration
  participant GS as geminiService
  participant S as Express
  participant AI as Provider AI
  participant FS as Firestore
  participant IDB as IndexedDB

  U->>App: Generate
  App->>App: buildFinalPrompts + buildEffectiveSettings
  App->>GS: generateImageVariations
  GS->>S: POST /api/rate-limit (Bearer)
  S-->>GS: 200 OK
  GS->>S: POST /api/generate (Bearer + payload)
  S->>AI: SDK / REST theo provider
  AI-->>S: ảnh base64 + usage
  S-->>GS: JSON
  GS-->>App: GeneratedImage[]
  App->>FS: addDoc history (metadata)
  App->>IDB: set img_{docId}
  App->>App: setHistoryImages optimistic
```



**Ghép hook trong `App.tsx` (thứ tự gọi)**

```mermaid
flowchart TD
  A[useAuthAndProfile] --> B[useHistoryImages]
  A --> C[useGlobalSettingsAndApiKey]
  B --> D[useImageGeneration]
  C --> D
  D --> E[handlers ảnh / CreateView / MultipleImage]
  E --> F[useGeneratedImageDownload]
```



> Gợi ý: GitHub và nhiều renderer Markdown hiển thị Mermaid trực tiếp; nếu viewer không hỗ trợ, copy khối code vào [mermaid.live](https://mermaid.live).

---

## 3. Kiến Trúc Backend & Database

Hệ thống sử dụng mô hình Full-stack với Express và Firebase.

- **Server**: [Express 5](https://expressjs.com/) chạy trên môi trường Node.js (`server.ts`).
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (named database theo `firebase-applet-config.json`).
  - Thông tin người dùng (`users`).
  - Lịch sử metadata (`history`; `imageUrl: 'idb'` khi blob lưu ở IndexedDB).
  - Cấu hình (`settings/global`).
  - Analytics (`analytics_events`), chi phí tháng (`monthly_costs`, hiện chỉ đọc trên UI analytics).
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) (đăng nhập Google).
- **Security Rules**: Phân quyền theo role (editor/advice/admin); `advice` có quyền xem analytics, `admin` có quyền quản trị.

---

## 4. API & AI Models

Ứng dụng tích hợp đa dạng các nhà cung cấp AI:

- **Gemini API (Google)**:
  - Model mặc định (cấu hình được): ví dụ `gemini-3.1-flash-image-preview`.
  - Image generation qua backend SDK `@google/genai`.
- **OpenAI API**: Model `DALL-E 3`.
- **Seedance API**: Model `seed-1.5-pro` (URL base có thể cấu hình).
- **Cơ chế thực thi**:
  - Frontend không gọi trực tiếp nhà cung cấp AI bằng API key công khai.
  - Frontend gọi `/api/rate-limit` rồi `/api/generate` kèm header `Authorization: Bearer <Firebase ID token>`.
  - Backend đọc provider/model từ Firestore `settings/global` và body request, sau đó gọi SDK/API tương ứng.
- **Thứ tự ưu tiên API key (backend)**:
  1. Biến môi trường (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `SEEDANCE_API_KEY`).
  2. Firestore `settings/global` (do Admin cập nhật).

---

## 5. Luồng Công Việc (Workflow)

1. **Đăng nhập**: Đăng nhập Google; profile được tạo/cập nhật trong Firestore (role, status). Admin có thể duyệt user pending (toast + badge trong header).
2. **Cấu hình UI**: Style, aspect ratio, image size, prompt(s), ảnh chính / reference — khớp với pipeline trong `lib/buildGenerationPrompts.ts`.
3. **Rate limiting**: Mỗi lần generate (từng prompt), client gọi `POST /api/rate-limit`; server giới hạn **10 request/phút/user** (in-memory — khi scale nhiều instance cần chiến lược tập trung nếu muốn giới hạn toàn cục).
4. **Tạo ảnh**:
  - Client: `generateImageVariations` → `/api/generate` (multipart JSON ảnh base64 trong body).
  - Server: xác thực token, đọc settings, gọi Gemini/OpenAI/Seedance; trả base64 + usage metadata.
5. **Lưu trữ sau khi thành công**:
  - Firestore: document `history` (prompt, `imageUrl: 'idb'`, …).
  - IndexedDB: key `img_{docId}` chứa data URL/blob ảnh.
  - UI cập nhật history optimistically qua `useImageGeneration` + `useHistoryImages`.
6. **Analytics**: Ghi `image_generation_*`, `image_downloaded`, `user_login` vào `analytics_events` (dashboard cho `admin` và `advice`).
7. **Tải xuống**: `useGeneratedImageDownload` — canvas, tuỳ chọn nền trong suốt / xóa nền heuristic.

---

## 6. Triển Khai (Deployment)

- **Môi trường**: Google Cloud Run (hoặc AI Studio Web App tùy pipeline của team).
- **Build & chạy**:
  - `npm run build`: Vite → `dist/`.
  - `npm start`: Express phục vụ static + API (`NODE_ENV=production`).
- **Port**:
  - Local: thường `3000` (hoặc `PORT` trong env).
  - Cloud Run: `process.env.PORT` (ví dụ `8080`).
- **Bảo mật release**:
  - Secret Manager / Cloud Run secrets cho API keys.
  - Không commit key thật; không nhét key vào biến `VITE_`* nếu có nguy cơ lộ ra bundle client.

---

## 7. Bảo Mật (Security Checklist)

- API key nhà cung cấp AI chỉ dùng trên backend (env / Secret Manager / Firestore admin-configured).
- `/api/generate` và `/api/rate-limit` yêu cầu Firebase ID token hợp lệ.
- Rate limit phía server giảm lạm dụng (lưu ý giới hạn trên một process).
- Firestore Rules khớp role user/admin.
- Session cache `global_settings` giảm đọc lặp; vẫn cần theo dõi quota Firestore.

---

## 8. Bảng Điều Khiển Admin (Admin Dashboard)

- `**role === 'admin'`**: đầy đủ tab **Người dùng**, **Cấu hình hệ thống**, **Analytics**; badge pending; toast duyệt user.
- `**role === 'advice'`**: chỉ **Analytics** (nút biểu đồ trên header); không quản lý user, không sửa cấu hình / chi phí / ngân sách trong UI. Firestore rules cho phép đọc `analytics_events`, `monthly_costs`, `users`, `history` (để bảng số ảnh theo user); ghi `monthly_costs` và cấu hình vẫn chỉ **admin**.
- `**role === 'editor'`**: không vào dashboard admin (trừ khi được nâng role).

Chi tiết tab admin:

- **Người dùng**: Danh sách, role (`admin` / `editor` / `advice`), trạng thái (pending/approved/rejected).
- **Cấu hình**: Khóa API và provider/model trong `settings/global`.
- **Analytics**: KPI theo tháng, token/model usage, trends, bảng **Số ảnh đã tạo theo người dùng** lọc theo tháng (`Month`) từ collection `history`.
- **Top Users panel**: đã loại bỏ khỏi UI.
- **Manual Infrastructure Costs**: đã loại bỏ khỏi UI (không còn thao tác nhập tay trên dashboard).

---

## 9. Hướng Dẫn Live Product (Cloud Run End-to-End)

Mục này là checklist đầy đủ để đưa bản hiện tại lên môi trường live an toàn.

### 9.1. Chuẩn bị local trước khi deploy

```bash
npm install
npm run lint
npm run build
```

Đảm bảo có các file cấu hình Firebase CLI ở root:

- `firebase.json`
- `.firebaserc`
- `firestore.indexes.json`

### 9.2. Đồng bộ Firestore Rules và Indexes

App đang dùng **named database** theo `firebase-applet-config.json`, nên cần deploy rules/indexes đúng database đã khai báo trong `firebase.json`.

```bash
firebase login
firebase deploy --only firestore --project zvas-ai-image
```

Nếu chưa cài Firebase CLI global:

```bash
npx firebase-tools@latest deploy --only firestore --project zvas-ai-image
```

### 9.3. Quản lý secrets cho runtime (phân theo số lượng API key)

Không truyền API key thật qua `VITE_*`. Chỉ dùng secret/env phía server.

#### Trường hợp A - chỉ 1 API key (Gemini-only)

1. Tạo secret Gemini (nếu chưa có) và thêm version:

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy=automatic --project zvas-ai-image
echo -n 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project zvas-ai-image
```

2. Cấp quyền cho runtime service account (ví dụ):

- `217522553738-compute@developer.gserviceaccount.com`

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --project zvas-ai-image \
  --member="serviceAccount:217522553738-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

3. Deploy chỉ với Gemini secret:

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --clear-base-image
```

4. Nếu service từng có OpenAI/Seedance env secret refs, cần remove trước:

```bash
gcloud run services update ai-image-zvas \
  --region us-west1 \
  --remove-secrets=OPENAI_API_KEY,SEEDANCE_API_KEY

gcloud run services update ai-image-zvas \
  --region us-west1 \
  --remove-env-vars=OPENAI_API_KEY,SEEDANCE_API_KEY
```

#### Trường hợp B - nhiều API key (Gemini + OpenAI + Seedance)

1. Tạo (hoặc rotate) đầy đủ secret versions:

```bash
echo -n 'YOUR_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project zvas-ai-image
echo -n 'YOUR_OPENAI_API_KEY' | gcloud secrets versions add OPENAI_API_KEY --data-file=- --project zvas-ai-image
echo -n 'YOUR_SEEDANCE_API_KEY' | gcloud secrets versions add SEEDANCE_API_KEY --data-file=- --project zvas-ai-image
```

2. Cấp `roles/secretmanager.secretAccessor` cho runtime service account trên cả 3 secret.

3. Deploy với full secret mapping:

```bash
gcloud run deploy ai-image-zvas \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,SEEDANCE_API_KEY=SEEDANCE_API_KEY:latest \
  --clear-base-image
```

> Lưu ý: Nếu gặp lỗi `Permission denied on secret ...`, nguyên nhân thường là runtime service account chưa được grant `secretAccessor` trên đúng secret đó.

### 9.6. Kiểm tra sau deploy (smoke test)

1. Mở URL Cloud Run, hard refresh.
2. Đăng nhập Google.
3. Generate ảnh ở `Create`.
4. Mở Analytics kiểm tra:
  - KPI theo tháng load được.
  - Bảng **Số ảnh đã tạo theo người dùng** lọc đúng theo `Month`.
5. Đăng nhập user role `advice`:
  - Chỉ xem được Analytics.
  - Không thấy tab Người dùng / Cấu hình.

### 9.7. Quan sát logs và rollback

Xem logs Cloud Run:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-image-zvas"' \
  --project zvas-ai-image \
  --limit 100 \
  --format="value(textPayload)"
```

Rollback revision nếu cần:

```bash
gcloud run revisions list --service ai-image-zvas --region us-west1
gcloud run services update-traffic ai-image-zvas --region us-west1 --to-revisions=REVISION_NAME=100
```

---

*Tài liệu cập nhật: tháng 5/2026 — phản ánh cấu trúc mã sau refactor (hooks, `lib/`, layout views), luồng API hiện tại, sơ đồ Mermaid (§2.4), và hướng dẫn live product end-to-end (§9).*