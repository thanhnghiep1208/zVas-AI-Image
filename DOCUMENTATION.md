# Tài Liệu Dự Án AI Image ZVAS

Tài liệu đã được tách theo từng chức năng để dễ đọc và bảo trì.

## Mục lục tài liệu

1. [01 - Tổng Quan](./docs/01-overview.md)
2. [02 - Kiến Trúc Frontend](./docs/02-frontend-architecture.md)
3. [03 - Backend & API](./docs/03-backend-api.md)
4. [04 - Workflow & Analytics](./docs/04-workflow-analytics.md)
5. [05 - Security & Roles](./docs/05-security-roles.md)
6. [06 - Live Deployment (Cloud Run)](./docs/06-live-deployment.md)
7. [07 - Refactor & cập nhật 05/2026](./docs/07-refactor-2026-05.md)
8. [08 - Đăng nhập & tài khoản](./docs/08-auth-users-setup.md) — username/password, `users/{uid}`, phiên đa thiết bị, service account local
9. [09 - Optimize 06/2026](./docs/09-optimize-2026-06.md)
10. [10 - Security Hardening 06/2026](./docs/10-security-hardening-2026-06.md) — CSP, prompt limit, password 12 chars, deps upgrade

## Gợi ý đọc nhanh

- Muốn nắm tổng quan nhanh: bắt đầu từ `docs/01-overview.md`.
- Muốn hiểu luồng tạo ảnh + analytics: xem `docs/04-workflow-analytics.md`.
- Chuẩn bị lên production: xem `docs/06-live-deployment.md`.
- Cấu hình đăng nhập / tạo user / lỗi “chưa được cấu hình”: xem `docs/08-auth-users-setup.md`.
- Phiên đăng nhập đa thiết bị (xem, đăng xuất phiên): `docs/08-auth-users-setup.md` § Phiên đăng nhập đa thiết bị.
- **Thay đổi refactor 05/2026** (admin/analytics split, aggregation, rate limit Firestore, Dockerfile): xem `docs/07-refactor-2026-05.md`.
- **Security hardening 06/2026** (CSP, prompt limit, password policy, firebase-admin v14, vite v8): xem `docs/10-security-hardening-2026-06.md`.
- UI shell, logo, banner Create, upload/kết quả: `docs/02-frontend-architecture.md`.
- So sánh model Gemini (popup header): `docs/so-sanh-model-gemini.md`.

## Checklist kỹ thuật nhanh (05/2026)

| Việc | Lệnh / ghi chú |
| ----- | -------------- |
| Kiểm tra types | `npm run lint` |
| Build frontend | `npm run build` |
| Tests | `npm test` (26 tests: aggregation + rate limit + validateUserInput + prompts) |
| Deploy rules + indexes | `firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image` |
| Deploy app | `gcloud run deploy` — Dockerfile cần `COPY server ./server` |

---

*Tài liệu split: tháng 5/2026. Bổ sung refactor 05/2026: tháng 5/2026.*
