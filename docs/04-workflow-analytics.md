# 04 - Workflow & Analytics

## Workflow tạo ảnh

1. User đăng nhập Google.
2. App build prompt cuối qua `buildGenerationPrompts`.
3. Client gọi `/api/rate-limit`.
4. Client gọi `/api/generate` với provider/model đang chọn.
5. Server trả base64 + usage metadata.
6. Client ghi metadata vào Firestore `history`.
7. Blob/dataURL ảnh lưu vào IndexedDB (`img_{docId}`).

## Analytics events

Các event chính được ghi vào `analytics_events`:

- `user_login`
- `image_generation_started`
- `image_generation_succeeded`
- `image_generation_failed`
- `image_downloaded`

Payload và chuẩn hóa lỗi: `services/analyticsService.ts` (`trackEvent` → repository Firestore).

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
| Đăng nhập (`user_login`) | `login` | `method`: `google` |
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
- Model usage (month).
- Trends chart.
- Bảng **Số ảnh đã tạo theo người dùng** lọc theo tháng (`history.createdAt`).
- Loading skeleton cho toàn trang khi đang tải.
- Hiển thị **thời gian cập nhật lần cuối** của bundle tổng quan (KPI + token + model): lấy từ `savedAt` của cache session hoặc thời điểm vừa tải xong từ server (kể cả làm mới nền mỗi 6 giờ).

## Những phần đã bỏ khỏi UI

- Top Users panel.
- Manual Infrastructure Costs input.