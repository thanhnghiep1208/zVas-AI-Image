# Tài Liệu Dự Án AI Image ZVAS

**Người mới bắt đầu từ [00 - Onboarding](./00-onboarding.md)** — cài đặt, lộ trình đọc, bản đồ code, quy trình PR → deploy.

Tài liệu chia thành hai loại:

- **Tài liệu tham chiếu** (00–06, 08, 12, `RELEASE_CHECKLIST`): mô tả hệ thống **hiện tại**, phải sửa cùng PR khi code đổi.
- **Nhật ký thay đổi** (07, 09–11, 13–16): ghi lại một đợt thay đổi tại thời điểm đó, không sửa theo code mới. Khi mâu thuẫn với tài liệu tham chiếu hoặc code, tin tài liệu tham chiếu và code.

Ngoài ra:

- [so-sanh-model-gemini.md](./so-sanh-model-gemini.md): nội dung popup so sánh model trên header — app import trực tiếp qua `?raw`, **không đổi tên/di chuyển**.
- [tasks/](./tasks/): PRD và danh sách task của từng tính năng.
- [templates/](./templates/): mẫu prompt để sinh PRD (`create-prd.md`) và task list (`generate-tasks.md`).

## Tài liệu tham chiếu

| Doc | Nội dung |
| --- | -------- |
| [00 - Onboarding](./00-onboarding.md) | Lộ trình cho người mới: setup local, lần theo request tạo ảnh, sửa X ở đâu, quy trình PR |
| [01 - Tổng quan](./01-overview.md) | Mục tiêu, tính năng, stack |
| [02 - Kiến trúc Frontend](./02-frontend-architecture.md) | Cấu trúc thư mục, hooks, shell UI, chọn model, Firestore reads |
| [03 - Backend & API](./03-backend-api.md) | `server/`, chuỗi middleware, endpoint, rate limit, key provider |
| [04 - Workflow & Analytics](./04-workflow-analytics.md) | Luồng tạo ảnh, analytics events, GA4, dashboard |
| [05 - Security & Roles](./05-security-roles.md) | Bảo vệ API, Firestore rules, role, CSP, mật khẩu |
| [06 - Live Deployment](./06-live-deployment.md) | GitHub Actions, ruleset `main`, secrets, rollback, troubleshooting |
| [08 - Đăng nhập & tài khoản](./08-auth-users-setup.md) | Username/password, `users/{uid}`, phiên đa thiết bị, service account |
| [12 - Sentry](./12-sentry-setup.md) | Error tracking, source maps |
| [RELEASE_CHECKLIST](./RELEASE_CHECKLIST.md) | Checklist phát hành production |

## Nhật ký thay đổi

| Doc | Đợt thay đổi |
| --- | ------------ |
| [07 - Refactor 05/2026](./07-refactor-2026-05.md) | Tách admin/analytics, aggregation, rate limit Firestore, Dockerfile |
| [09 - Optimize 06/2026](./09-optimize-2026-06.md) | CORS, hiệu năng |
| [10 - Security hardening 06/2026](./10-security-hardening-2026-06.md) | CSP, prompt limit, mật khẩu 12 ký tự, xoá `/api/rate-limit` (TOCTOU), SSRF validate, nâng deps |
| [11 - Reliability & polling 06/2026](./11-reliability-polling-2026-06.md) | `usePolling`, graceful shutdown |
| [13 - SSRF & MIME 07/2026](./13-security-ssrf-mime-2026-07.md) | MIME upload allowlist, `ssrfSafeFetch` chống DNS rebinding |
| [14 - Nano Banana 2.1 10/2026](./14-nano-banana-2-1-2026-10.md) | Model mặc định 2.1, model ID GA, rollback, bỏ 512px |
| [15 - Giảm lượt tạo thất bại 10/2026](./15-generation-failures-2026-10.md) | Retry/timeout Gemini, mã lỗi, phân tích lỗi |
| [16 - Allowlist base URL 10/2026](./16-provider-baseurl-allowlist-2026-10.md) | Chặn rò key qua base URL, thực thi `enabledProviders` |

## Tra nhanh

| Câu hỏi | Xem |
| ------- | --- |
| Setup máy mới | `00-onboarding.md` §3 |
| Lỗi "chưa được cấu hình" / tạo user | `08-auth-users-setup.md` |
| Deploy thế nào | `06-live-deployment.md` §0 — merge PR vào `main`; `gcloud` tay chỉ dự phòng |
| Rollback model Nano Banana 2.1 | `06-live-deployment.md` §5 |
| Container không listen PORT 8080 | `06-live-deployment.md` §9 |

## Checklist kỹ thuật

| Việc | Lệnh / ghi chú |
| ----- | -------------- |
| Kiểm tra types | `npm run lint` |
| Build frontend | `npm run build` |
| Tests | `npm test` — mọi `*.test.ts` (248 test tại 29/10/2026) |
| Deploy rules + indexes | `firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image` (tay, trước khi merge nếu rules đổi) |
| Deploy app | Merge PR vào `main` → GitHub Actions (`.github/workflows/deploy.yml`) |

## Quy ước khi sửa docs

- Đổi code ảnh hưởng hành vi/đường dẫn trong tài liệu tham chiếu → sửa doc trong cùng PR.
- Một đợt thay đổi lớn (bảo mật, refactor, sự cố) → thêm doc nhật ký `NN-ten-YYYY-MM.md` và thêm vào bảng trên.
- Không ghi số liệu dễ trôi (số test, kích thước bundle) vào tài liệu tham chiếu ngoài bảng checklist này.
