# 15 - Giảm lượt tạo thất bại — Phase 0–2 (10/2026)

> **Nhật ký thay đổi** — ghi lại trạng thái tại thời điểm viết, không sửa theo code mới. Trạng thái hiện tại xem docs 01–06, 08 và [00-onboarding](./00-onboarding.md).

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

## Phase 1 — lỗi phía client

### "Load failed" sau < 1s là click kép, không phải lỗi mạng

Đối chiếu Firestore với request log Cloud Run (26–28/10): mỗi lỗi Safari "Load failed" sau 55–400ms đều có **2 sự kiện `image_generation_started` cách nhau 50–100ms**; request đầu bị hủy, request sau thành công (~15–25s). Không trùng giờ deploy revision; Cloud Run `timeoutSeconds=300`.

Nguyên nhân: nút "Tạo ảnh" chỉ dựa vào `disabled={isLoading}`, có hiệu lực sau khi React render lại. Sửa: `createSingleFlightGuard` (`utils/singleFlight.ts`) trong `useImageGeneration` và `MergeImage` — lần gọi thứ hai khi lượt trước còn chạy bị bỏ qua.

**Không** thêm retry tự động cho lỗi mạng nhanh: những lỗi này là request trùng, retry sẽ tạo ảnh (và chi phí) trùng. Lỗi "Failed to fetch" sau 10–80s là mất kết nối giữa chừng — request có thể đã tới Gemini, retry có nguy cơ tính phí 2 lần.

### Lỗi đọc file

`FileReader.onerror` reject bằng `ProgressEvent` (không có message) → analytics ghi "An unknown error occurred." (fail sau ~20ms, 1 lần `started`). Giờ reject `File read failed: <DOMException name>` → `error_code=file_read_failed`, dashboard hiện "File Read Failed", user được bảo chọn lại ảnh. Rejection không phải `Error` còn lại ghi kèm tên/kiểu để chẩn đoán tiếp.

### Field chẩn đoán mới trên `image_generation_failed`

`http_status` (không có = request không tới server), `online` (`navigator.onLine`), `page_visibility` (`document.visibilityState`).

## Phase 2 — số liệu và dashboard

### Một bộ phân loại lỗi

`lib/generationErrors.ts` thay cho 3 bộ luật keyword trùng lặp (`geminiService`, `normalizeErrorCode` trong `analyticsService`, `mapErrorType` trong `analyticsAggregation`). Mỗi mã có `label`, `severity` và `source`:

| `source` | Nghĩa | Mã |
|---|---|---|
| `user` | Do nội dung/thao tác | `payload_too_large`, `file_read_failed`, `content_filter`, `invalid_prompt` |
| `client` | Mạng/thiết bị user | `network_error` |
| `system` | Server, nhà cung cấp, cấu hình | còn lại (kể cả `no_output`, `unknown_error`) |

Rule được kiểm bằng message thật trong `analytics_events`. Chạy lại trên 326 lỗi 04–10/2026: chỉ còn 24 `unknown_error` (event không có chi tiết); trước đây ô "Unknown Error" gom cả 44 lỗi 413 vì event cũ ghi `error_code=unknown_error` — dashboard giờ phân loại lại từ `error_message_short` khi code là unknown. Thêm mã `config_error` (thiếu/sai API key, credentials).

Khi gặp message mới không phân loại được: thêm case vào `generationErrors.test.ts` rồi thêm rule vào `RULES` (thứ tự quan trọng — rule cụ thể đứng trước).

### Dashboard

- Bảng "Lượt tạo thất bại" ghi nguồn của từng loại lỗi.
- Panel mới `FailureDimensionsPanel`: số lỗi theo nguồn, tỉ lệ lỗi theo model, top 10 user theo số lỗi (tô vàng user chiếm ≥ 30% số lỗi).
- `MonthlyDashboardBundle.failureStats` (`buildMonthlyFailureStatsFromEvents`); `ANALYTICS_ROLLUP_VERSION` lên 2. Tại 2026-10-28 collection `analytics_monthly_rollups` trống (`rebuildMonthlyAnalyticsRollup` chưa được gọi ở đâu) nên không cần migrate.

Dữ liệu tháng 10/2026 trên panel mới: 32 lỗi, toàn bộ của một user (user đó chiếm 1.700/1.713 lượt tạo) — 41% hệ thống, 31% mạng/thiết bị, 28% do nội dung.
