# 04 - Workflow & Analytics

## Workflow tạo ảnh

1. User đăng nhập (username + mật khẩu → Firebase Auth email `{username}@zvas.local`; cần `users/{uid}` — xem `docs/08-auth-users-setup.md`).
2. App build prompt cuối qua `buildGenerationPrompts`.
3. Client gọi `/api/rate-limit`.
4. Client gọi `/api/generate` với provider/model đang chọn.
5. Server trả base64 + usage metadata.
6. Client ghi metadata vào Firestore `history`.
7. Blob/dataURL ảnh lưu vào IndexedDB (`img_{docId}`).

## Analytics events

Các event chính được ghi vào `analytics_events`:

- `user_login` (sau đăng nhập username/password thành công)
- `image_generation_started`
- `image_generation_succeeded`
- `image_generation_failed`
- `image_downloaded`

Payload và chuẩn hóa lỗi: `services/analyticsService.ts` (`trackEvent` → repository Firestore).

### Lớp aggregation (pure, dùng chung client + server)

| Module | Vai trò |
| ------ | ------- |
| `services/analyticsTypes.ts` | Types: `MonthlyAnalytics`, `MonthlyDashboardBundle`, `TrendPoint`, … |
| `services/analyticsAggregation.ts` | Hàm thuần: `monthBounds`, `buildMonthlyDashboardBundleFromEvents`, `aggregateTrendPoints`, `buildMonthlyTopModelStatsFromEvents`, `buildMonthlyRollupDocument` |
| `services/analyticsService.ts` | I/O Firestore: rollup doc → fallback quét `analytics_events` (pagination) |

- Dashboard bundle: ưu tiên `analytics_monthly_rollups/{YYYY-MM}` (`version: 1`); thiếu doc thì aggregate từ events.
- Trends (`hooks/useTrendData.ts`) gọi aggregation thay vì logic trùng lặp.
- Job rebuild rollup (Admin SDK): `server/lib/monthlyRollupBuilder.ts` → `rebuildMonthlyAnalyticsRollup(monthKey)` (không có route HTTP public).
- Tests: `npm test` — `analyticsAggregation.test.ts`, `rateLimit.test.ts`.

#### Date bucketing — UTC nhất quán

`aggregateTrendPoints` (và `useTrendData.ts`) dùng **UTC** cho toàn bộ date arithmetic (`setUTCDate`, `setUTCHours`, `getUTCDay`). Tất cả bucket key và event key đều lấy từ `.toISOString().slice(0, 10)` nên khớp nhau ở mọi timezone. Không dùng `setHours` / `setDate` local.

#### Top model stats — attempts + successes

`buildMonthlyTopModelStatsFromEvents` đếm song song hai chỉ số per model:

| Field trong `modelBreakdown` | Nguồn event |
| ---------------------------- | ----------- |
| `requestCount` | `image_generation_started` (số lần thử) |
| `successCount` | `image_generation_succeeded` (số ảnh thành công) |

Ranking (thứ tự sort) theo `requestCount`. UI `ModelUsageCard` hiển thị cả hai cột.

## Google Analytics 4 (GA4)

Hệ thống có **hai luồng** bổ sung cho nhau:

| Luồng | Mục đích | Nguồn sự thật |
| ----- | -------- | -------------- |
| **Firestore `analytics_events`** | Dashboard nội bộ, chi phí/token, MAU theo tháng | `trackEvent()` |
| **GA4 (gtag.js)** | Báo cáo marketing/funnel trên Google Analytics | `utils/gtagEvent.ts` |

- **Measurement ID** (một property duy nhất): `G-W5YSHKJ7ZD` — cấu hình trong `index.html` (load `gtag/js` + `gtag('config', ...)`).
- **Khi nào gửi event GA4:** chỉ khi **`import.meta.env.PROD === true`** (bản build production). `npm run dev` **không** gọi `gtag('event', ...)` để tránh nhiễu số liệu trên cùng property.
- **File triển khai:** `utils/gtagEvent.ts` (`sendGa4Event`, helper theo tên GA4 recommended); gọi song song với Firestore tại `App.tsx`, `hooks/useImageGeneration.ts`, `components/layout/AppHeader.tsx` (popup so sánh model).

### Bảng map hành vi → GA4 (tên recommended)

| Hành vi / tương đươ Firestore | GA4 `event_name` | Ghi chú params |
| ----------------------------- | ---------------- | -------------- |
| Đăng nhập (`user_login`) | `login` | `method`: `email` (hoặc giá trị client gửi) |
| Bắt đầu generate (`image_generation_started`) | `begin_checkout` | `currency`: `USD`, `value`: `0`, `items[]` (model, quantity = số prompt) |
| Generate thành công (`image_generation_succeeded`) | `purchase` | `transaction_id` (UUID mỗi lần bấm generate), `value` = `estimated_api_cost`, `currency`, `items[]` (`price` = value / số ảnh hợp lệ) |
| Generate lỗi / ảnh lỗi | `exception` | `description` (rút gọn), `fatal`: `false` |
| Tải ảnh (`image_downloaded`) | `file_download` | `file_extension` (`jpg`/`png`), `remove_background`, `generation_view` |
| Đổi tab Tạo / Trộn / Hàng loạt | `select_content` | `content_type`: `app_tab`, `item_id`: `create` \| `merge` \| `multiple` |
| Đổi model (header) | `select_item` | `items[]`: `item_id`, `item_name`, `item_list_name`: `header_model` |
| Mở popup so sánh Gemini | `select_content` | `content_type`: `help`, `item_id`: `model_comparison` |
| Mở admin (Settings / Users / Analytics / toast pending) | `select_content` | `content_type`: `admin`, `item_id`: `settings` \| `users` \| `analytics` \| `users_toast` |

### Kiểm thử GA4

- GA4 Admin → **DebugView** (hoặc Realtime), deploy bản production, thực hiện login → đổi tab → generate → tải file và đối chiếu tên event.

## Analytics dashboard hiện tại

- KPI theo `Month`.
- Token usage.
- Model usage (month) — hiển thị **attempts** và **ok** (thành công) theo từng model.
- Trends chart (30 ngày / 8 tuần).
- Bảng **Số ảnh đã tạo theo người dùng** lọc theo tháng.
- Loading skeleton cho toàn trang khi đang tải.
- Hiển thị **thời gian cập nhật lần cuối** của bundle tổng quan (KPI + token + model): lấy từ `savedAt` của cache session hoặc thời điểm vừa tải xong từ server (kể cả làm mới nền mỗi 6 giờ).

## Những phần đã bỏ khỏi UI

- Top Users panel.
- Manual Infrastructure Costs input.

## UI Analytics (module)

| Thành phần | File |
| ---------- | ---- |
| Shell + nút **Yêu cầu dữ liệu** | `components/analytics/AnalyticsDashboard.tsx` |
| KPI / token / model | `components/analytics/AnalyticsWidgets.tsx` |
| Trends | `components/analytics/TrendsSection.tsx` + `hooks/useTrendData.ts` |
| Đếm ảnh/user | `components/analytics/UserHistoryCountsPanel.tsx` — nguồn: `analytics_events` (không bị mất khi user xóa history) |
| Cache session | `components/analytics/analyticsCache.ts` |
| Data hook | `hooks/useAnalyticsDashboardData.ts` |

Admin nhúng Analytics: `components/admin/AdminDashboard.tsx` (tab lazy).

Chi tiết refactor: `docs/07-refactor-2026-05.md`