# 15 - Giảm lượt tạo thất bại — Phase 0 (10/2026)

Ngày: 2026-10-28. Dựa trên 326 sự kiện `image_generation_failed` (04–10/2026, ~1,9% số lượt tạo tháng 10).

| Nhóm lỗi | Tỉ trọng | Nguyên nhân | Sửa |
|---|---|---|---|
| 413 payload | ~29% | `handleImageSelect` không kiểm tổng dung lượng khi đã có ảnh tham chiếu; ảnh không được nén | `exceedsTotalImageSizeLimit` cho cả 2 nhánh; `compressImageForUpload` thu nhỏ ≤ 2048px trước khi base64; chặn payload > 9,5MB ở client |
| no_output | ~22% | Server bỏ qua `finishReason` / `promptFeedback.blockReason` | `extractGeminiResult` + `classifyMissingImage`: bộ lọc → `content_filter` (422, không retry); còn lại retry 1 lần rồi `no_output` (502) |
| 503 / 500 tạm thời | ~4% | Không có retry | `generateWithRetry`: tối đa 3 lần, backoff 1s/2s + jitter |
| 504 sau 300s | ~3% | Không có timeout, chạm timeout Cloud Run | `AbortSignal.timeout` mỗi lần gọi (≤150s), tổng ngân sách 240s → `timeout` (504); client hủy sau 270s |

## Hợp đồng lỗi `/api/generate` (Gemini)

Response lỗi giờ có `code` máy đọc được: `{ error, code }` với `code ∈ content_filter | no_output | timeout | service_unavailable | quota_exceeded | server_error`. `geminiService` ưu tiên `code` này hơn đoán từ message khi ghi `error_code` analytics.

## Lưu ý vận hành

- Ngân sách 240s giả định Cloud Run `--timeout` ≥ 300s (mặc định). Nếu hạ timeout service, hạ `GEMINI_TOTAL_BUDGET_MS` (server) và `GENERATE_REQUEST_TIMEOUT_MS` (client) tương ứng.
- Mỗi lần retry Gemini có thể bị tính phí; timeout không retry vì lý do này.
- Log `[generate] Gemini attempt N failed` / `succeeded after N attempts` để đo hiệu quả retry trên Cloud Run.

## Còn lại (Phase 1–2)

Lỗi mạng "Load failed" (fail sau < 1s), `FileReader` lỗi ("An unknown error occurred"), gộp 3 bộ phân loại lỗi trùng lặp, dashboard theo model/user.
