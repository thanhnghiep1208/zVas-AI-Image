# Tài Liệu Dự Án AI Image ZVAS

Tài liệu đã được tách theo từng chức năng để dễ đọc và bảo trì.

Cấu trúc thư mục `docs/`:

- `NN-*.md`: tài liệu chính, đánh số theo thứ tự (mục lục bên dưới).
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md): checklist kiểm tra trước khi phát hành.
- [tasks/](./tasks/): PRD và danh sách task của từng tính năng.
- [templates/](./templates/): mẫu prompt để sinh PRD (`create-prd.md`) và task list (`generate-tasks.md`).

## Mục lục tài liệu

1. [01 - Tổng Quan](./01-overview.md)
2. [02 - Kiến Trúc Frontend](./02-frontend-architecture.md)
3. [03 - Backend & API](./03-backend-api.md)
4. [04 - Workflow & Analytics](./04-workflow-analytics.md)
5. [05 - Security & Roles](./05-security-roles.md)
6. [06 - Live Deployment (Cloud Run)](./06-live-deployment.md) — deploy tự động qua GitHub Actions khi merge `main`, ruleset bảo vệ `main`, sự cố sidecar AI Studio
7. [07 - Refactor & cập nhật 05/2026](./07-refactor-2026-05.md)
8. [08 - Đăng nhập & tài khoản](./08-auth-users-setup.md) — username/password, `users/{uid}`, phiên đa thiết bị, service account local
9. [09 - Optimize 06/2026](./09-optimize-2026-06.md)
10. [10 - Security Hardening 06/2026](./10-security-hardening-2026-06.md) — CSP, prompt limit, password 12 chars, SSRF validate, Vite define removal, deps upgrade
11. [11 - Reliability & Polling 06/2026](./11-reliability-polling-2026-06.md)
12. [12 - Sentry setup](./12-sentry-setup.md)
13. [13 - Security SSRF (DNS rebinding) & MIME 07/2026](./13-security-ssrf-mime-2026-07.md) — MIME upload allowlist, SSRF DNS rebinding/redirect (`ssrfSafeFetch`, `ipRanges`)
14. [14 - Nano Banana 2.1 10/2026](./14-nano-banana-2-1-2026-10.md) — model mặc định 2.1, model ID GA, rollback cho admin
15. [15 - Giảm lượt tạo thất bại 10/2026](./15-generation-failures-2026-10.md) — phân loại lỗi, phân tích lỗi theo nguồn/model/user
16. [16 - Allowlist base URL provider 10/2026](./16-provider-baseurl-allowlist-2026-10.md) — chặn rò khóa API qua base URL tùy ý

## Gợi ý đọc nhanh

- Muốn nắm tổng quan nhanh: bắt đầu từ `docs/01-overview.md`.
- Muốn hiểu luồng tạo ảnh + analytics: xem `docs/04-workflow-analytics.md`.
- Chuẩn bị lên production: xem `docs/06-live-deployment.md`. Từ 10/2026 deploy = merge PR vào `main` (GitHub Actions, §0); deploy tay bằng `gcloud` chỉ là dự phòng.
- Cấu hình đăng nhập / tạo user / lỗi “chưa được cấu hình”: xem `docs/08-auth-users-setup.md`.
- Phiên đăng nhập đa thiết bị (xem, đăng xuất phiên): `docs/08-auth-users-setup.md` § Phiên đăng nhập đa thiết bị.
- **Thay đổi refactor 05/2026** (admin/analytics split, aggregation, rate limit Firestore, Dockerfile): xem `docs/07-refactor-2026-05.md`.
- **Security hardening 06/2026** (CSP, prompt limit, password policy, SSRF validate, Vite define removal, firebase-admin v14, vite v8): xem `docs/10-security-hardening-2026-06.md`.
- **Security 07/2026** (MIME upload allowlist, SSRF DNS rebinding/redirect qua `ssrfSafeFetch`): xem `docs/13-security-ssrf-mime-2026-07.md`.
- UI shell, logo, banner Create, upload/kết quả: `docs/02-frontend-architecture.md`.
- So sánh model Gemini (popup header): `docs/so-sanh-model-gemini.md`.
- Trước khi phát hành: `docs/RELEASE_CHECKLIST.md`.

## Checklist kỹ thuật nhanh (05/2026)

| Việc | Lệnh / ghi chú |
| ----- | -------------- |
| Kiểm tra types | `npm run lint` |
| Build frontend | `npm run build` |
| Tests | `npm test` (55 tests: aggregation + rate limit + validateUserInput + prompts + fileValidation + ipRanges + ssrfSafeFetch + validateBaseUrl) |
| Deploy rules + indexes | `firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image` |
| Deploy app | Push/merge `main` → GitHub Actions (`.github/workflows/deploy.yml`); dự phòng `gcloud run deploy` — Dockerfile cần `COPY server ./server` |

---

*Tài liệu split: tháng 5/2026. Bổ sung refactor 05/2026: tháng 5/2026.*
