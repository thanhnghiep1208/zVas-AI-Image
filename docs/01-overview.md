# 01 - Tổng Quan

AI Image ZVAS là ứng dụng web tạo và biến thể hình ảnh bằng AI, tích hợp Gemini/OpenAI/Seedance, Firebase Auth/Firestore và dashboard quản trị.

## Mục tiêu

- Cung cấp công cụ tạo ảnh AI cho user cá nhân/doanh nghiệp.
- Hỗ trợ nhiều chế độ thao tác ảnh trong cùng một app.
- Có dashboard theo dõi và quản trị cho vận hành live.

## Tính năng chính

- Text-to-Image.
- Image-to-Image.
- Merge Image.
- Tạo nhiều biến thể cùng lúc.
- Quản lý lịch sử ảnh theo user.
- Phân quyền `admin` / `advice` / `editor`.

## Công nghệ chính

- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS 4.
- Backend: Express 5 (`server.ts`).
- Database/Auth: Firebase Firestore (named DB) + Firebase Auth (**email/mật khẩu**, username → `user@zvas.local`).
- Analytics: Firestore `analytics_events` (dashboard nội bộ, Recharts) + **GA4** (`G-W5YSHKJ7ZD`, event qua `utils/gtagEvent.ts`, chỉ bản production build).

## Cập nhật kiến trúc (05/2026)

- **Admin / Analytics:** UI tách `components/admin/`, `components/analytics/` + hooks (`useAdminUsers`, `useAdminSettings`, `useAnalyticsDashboardData`); shell `AppAuthenticatedShell.tsx`.
- **Analytics:** lớp pure `services/analyticsAggregation.ts` + rollup `analytics_monthly_rollups/{YYYY-MM}`; job server `monthlyRollupBuilder.ts`.
- **Rate limit:** Firestore fixed-window trên Cloud Run (`server/lib/rateLimit/`), collection `rate_limit_windows` (client deny).
- **Deploy:** Dockerfile bắt buộc `COPY server ./server`; tests `npm test` (aggregation + rate limit).

Chi tiết: `docs/07-refactor-2026-05.md`

## Tài liệu liên quan

- Frontend: `docs/02-frontend-architecture.md`
- Backend/API: `docs/03-backend-api.md`
- Workflow/Analytics: `docs/04-workflow-analytics.md`
- Security/Roles: `docs/05-security-roles.md`
- Live Deploy: `docs/06-live-deployment.md`
- Refactor 05/2026: `docs/07-refactor-2026-05.md`
- Đăng nhập, user Firestore, phiên đa thiết bị: `docs/08-auth-users-setup.md`
- So sánh model ảnh Gemini (Nano Banana 2 vs Pro, dùng trong popup header): `docs/so-sanh-model-gemini.md`