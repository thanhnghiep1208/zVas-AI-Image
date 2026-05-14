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