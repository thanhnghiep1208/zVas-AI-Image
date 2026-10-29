# 01 - Tổng Quan

AI Image ZVAS là ứng dụng web tạo và biến thể hình ảnh bằng AI, tích hợp Gemini/OpenAI/Seedance/Seedream, Firebase Auth/Firestore và dashboard quản trị.

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
- Phân quyền `admin` / `advice` / `editor`; user mới phải được admin duyệt (`status: approved`) mới dùng được tool và API.
- Admin: quản lý user, cấu hình provider/model (`settings/global`), thông tin liên hệ trên popup đăng nhập (`settings/public`), dashboard Analytics.

## Công nghệ chính

- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS 4.
- Backend: Express 5 (`server.ts`).
- Database/Auth: Firebase Firestore (named DB) + Firebase Auth (**email/mật khẩu**, username → `user@zvas.local`).
- Hạ tầng: một container Node trên **Cloud Run** (`us-west1`), deploy tự động qua GitHub Actions khi merge `main`; error tracking **Sentry** (tuỳ chọn).
- Analytics: Firestore `analytics_events` (dashboard nội bộ, Recharts) + **GA4** (`G-W5YSHKJ7ZD`, event qua `utils/gtagEvent.ts`, chỉ bản production build).

## Cập nhật kiến trúc (05/2026)

- **Admin / Analytics:** UI tách `components/admin/`, `components/analytics/` + hooks (`useAdminUsers`, `useAdminSettings`, `useAnalyticsDashboardData`); shell `AppAuthenticatedShell.tsx`.
- **Analytics:** lớp pure `services/analyticsAggregation.ts` + rollup `analytics_monthly_rollups/{YYYY-MM}`; job server `monthlyRollupBuilder.ts`.
- **Rate limit:** Firestore fixed-window trên Cloud Run (`server/lib/rateLimit/`), collection `rate_limit_windows` (client deny).
- **Deploy:** Dockerfile bắt buộc `COPY server ./server`, `utils`, `constants`; `npm test` chạy toàn bộ `*.test.ts`.

Các thay đổi sau 05/2026 (bảo mật, polling, Nano Banana 2.1, giảm lỗi tạo ảnh, allowlist base URL) ghi trong các doc 09–16.

Chi tiết: `docs/07-refactor-2026-05.md`

## Tài liệu liên quan

- **Người mới bắt đầu:** `docs/00-onboarding.md`

- Frontend: `docs/02-frontend-architecture.md`
- Backend/API: `docs/03-backend-api.md`
- Workflow/Analytics: `docs/04-workflow-analytics.md`
- Security/Roles: `docs/05-security-roles.md`
- Live Deploy: `docs/06-live-deployment.md`
- Refactor 05/2026: `docs/07-refactor-2026-05.md`
- Đăng nhập, user Firestore, phiên đa thiết bị: `docs/08-auth-users-setup.md`
- Optimize 06/2026: `docs/09-optimize-2026-06.md`
- Security hardening 06/2026: `docs/10-security-hardening-2026-06.md`
- Reliability & polling 06/2026: `docs/11-reliability-polling-2026-06.md`
- Sentry setup: `docs/12-sentry-setup.md`
- Security SSRF (DNS rebinding) & MIME 07/2026: `docs/13-security-ssrf-mime-2026-07.md`
- Nâng cấp Nano Banana 2.1, model ID GA, rollback admin 10/2026: `docs/14-nano-banana-2-1-2026-10.md`
- Giảm lượt tạo thất bại 10/2026: `docs/15-generation-failures-2026-10.md`
- Allowlist base URL provider 10/2026: `docs/16-provider-baseurl-allowlist-2026-10.md`
- So sánh model ảnh Gemini (Nano Banana 2.1 vs Pro, dùng trong popup header): `docs/so-sanh-model-gemini.md`
- **Default model:** Nano Banana 2.1 (`gemini-nano-banana-2.1`, hằng `GEMINI_MODEL_FALLBACK`) — nằm đầu mảng `gemini` trong `constants/aiModels.ts`, được dùng làm fallback khi user chưa chọn model. Nano Banana 2 (`gemini-3.1-flash-image`) chỉ còn là phương án rollback do admin bật (xem `docs/06-live-deployment.md`).
