# 16 - Chốt base URL provider theo allowlist (10/2026)

> **Nhật ký thay đổi** — ghi lại trạng thái tại thời điểm viết, không sửa theo code mới. Trạng thái hiện tại xem docs 01–06, 08 và [00-onboarding](./00-onboarding.md).

Ngày: 2026-10-28. Vá lỗ rò khóa API phát hiện khi rà soát bảo mật.

## Lỗ hổng

`/api/generate` và `/api/provider-test` nhận `seedanceBaseUrl` / `seedreamBaseUrl` từ body request (ưu tiên hơn `settings` của admin), rồi gọi `${baseUrl}/...` **kèm** khóa server trong header `Authorization: Bearer`. `ssrfSafeFetch` chỉ chặn IP nội bộ, không giới hạn host ngoài. Hệ quả: một user đã được duyệt (không cần admin) đặt `seedanceBaseUrl=https://attacker.example` → server gửi `SEEDANCE_API_KEY` / `SEEDREAM_API_KEY` thật tới host của kẻ tấn công. Điều kiện khai thác: khóa provider tương ứng có trong env.

## Vá

`validateProviderBaseUrl(baseUrl, provider)` trong `server/lib/validateBaseUrl.ts`: ngoài kiểm https + chặn IP nội bộ (như `validateHttpsBaseUrl`), thêm allowlist host theo provider.

| Provider | Host mặc định cho phép |
|---|---|
| seedance | `api.seedance.com` (khớp chính xác) |
| seedream | `.bytepluses.com` (khớp hậu tố, gồm các region `ark.*.bytepluses.com`) |

- Mục bắt đầu bằng `.` là khớp hậu tố domain; so khớp chống `api.seedance.com.evil.net`.
- Admin tự host proxy riêng: thêm host qua env `SEEDANCE_ALLOWED_HOSTS` / `SEEDREAM_ALLOWED_HOSTS` (danh sách phân cách phẩy), tương tự `SSRF_ALLOWED_HOSTS`.
- Áp dụng ở cả `generate.ts` và `providerTest.ts`.

## Kèm theo

- `/api/provider-test` nay cũng qua `tryConsumeRateLimit` (10 req/phút/user) — trước đây không giới hạn, dù nó gọi ra ngoài và là đường rò ở trên.

## Phòng thủ nhiều lớp (bổ sung)

- `resolveProviderFromSettings` nay thực thi `enabledProviders`: khi admin cấu hình allowlist (danh sách không rỗng), provider yêu cầu phải nằm trong đó, nếu không dùng provider enabled đầu tiên. Allowlist rỗng/chưa cấu hình giữ nguyên hành vi cũ (không giới hạn) để tương thích ngược.
- Test khóa Gemini (`/api/provider-test`) chuyển từ query string `?key=...` sang header `x-goog-api-key` — query dễ lọt vào access log/proxy hơn header. Đã xác nhận endpoint Google chấp nhận header này (200) và từ chối khi thiếu (403).
