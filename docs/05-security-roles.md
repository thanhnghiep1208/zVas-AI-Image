# 05 - Security & Roles

## Nguyên tắc bảo mật

- Key provider chỉ dùng phía server.
- Không commit key thật vào repo.
- Không dùng `VITE_*` cho secret runtime.
- Secret production nên lấy từ Secret Manager.

## Firestore rules tổng quát

- `/api/generate` và `/api/rate-limit` yêu cầu Firebase ID token hợp lệ.
- Rules kiểm soát read/write theo role.
- Named database cần deploy rules/indexes đúng cấu hình `firebase.json`.

## Phân quyền role

### `admin`

- Truy cập đầy đủ: Users, Settings, Analytics.
- Có quyền ghi `settings/global`, `monthly_costs`.

### `advice`

- Chỉ xem Analytics dashboard.
- Không quản lý user, không sửa settings/costs.
- Được đọc `analytics_events`, `monthly_costs`, `users`, `history` theo rules hiện tại để hiển thị dashboard.

### `editor`

- Không vào admin dashboard.
- Dùng các chức năng tạo ảnh thông thường.

## Checklist bảo mật nhanh

- Đã giới hạn Secret Manager IAM cho runtime service account.
- Đã giới hạn API key web theo domain trong Firebase/GCP.
- Đã deploy rules/indexes đúng project + database.