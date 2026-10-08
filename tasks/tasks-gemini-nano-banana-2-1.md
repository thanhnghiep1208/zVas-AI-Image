# Tasks: Nâng cấp Gemini Nano Banana 2.1

## Relevant Files

- `constants/aiModels.ts` - Danh sách model, `GEMINI_MODEL_FALLBACK`, `ALLOWED_GEMINI_MODEL_IDS`, `normalizeGeminiModelId`, `resolveModelKey`. Thêm hằng số ID cho từng model và hàm thuần chọn model Flash theo setting admin.
- `constants/aiModels.test.ts` - (Mới) Unit test cho các hàm trong `aiModels.ts`.
- `utils/generationModelPreference.test.ts` - Test hiện có cho preference model trong localStorage. Cập nhật để mặc định là 2.1 và thêm case chuyển NB2 cũ sang 2.1.
- `hooks/useGlobalSettingsAndApiKey.ts` - Tính `availableModelOptions` và `getEffectiveModel()` cho user. Phải truyền `globalSettings.geminiModel` vào hàm chọn model Flash.
- `App.tsx` - Nơi đọc và lưu preference `preferred_generation_models`.
- `server/routes/generate.ts` - Route tạo ảnh. Dòng 170 đang hardcode fallback, chưa kiểm tra model ID. Dòng 208 truyền `imageSize`, dòng 229 đọc `usageMetadata`.
- `server/lib/resolveGeminiModel.ts` - (Mới) Hàm thuần: kiểm tra ID hợp lệ và áp dụng rollback (2.1 → NB2) phía server.
- `server/lib/resolveGeminiModel.test.ts` - (Mới) Unit test cho `resolveGeminiModel.ts`.
- `hooks/useAdminSettings.ts` - State `geminiModel` của admin (dòng 17 đang hardcode NB2).
- `components/admin/AdminSettingsTab.tsx` - Dropdown chọn model Gemini của admin (dòng 96–97).
- `utils/geminiPricing.ts` - (Mới) Tách bảng giá và `resolveGeminiImagePricing` ra khỏi hook để test được.
- `utils/geminiPricing.test.ts` - (Mới) Unit test cho bảng giá.
- `hooks/useImageGeneration.ts` - Đang chứa bảng giá Gemini (dòng 24–48). Sẽ import từ `utils/geminiPricing.ts`.
- `docs/so-sanh-model-gemini.md` - Nội dung popup so sánh, được `GeminiModelComparisonModal` đọc qua `?raw`.
- `components/layout/GeminiModelComparisonModal.tsx` - Bộ render markdown của popup. Chỉ đọc để biết cú pháp nào được hỗ trợ, không sửa.
- `components/layout/AppHeader.tsx` - Nút info mở popup (dòng 219, `title`).
- `docs/01-overview.md`, `docs/02-frontend-architecture.md`, `docs/03-backend-api.md`, `docs/06-live-deployment.md` - Tài liệu nhắc tới model mặc định và danh sách model.
- `scripts/verify-nano-banana-2-1.ts` - (Mới, tạm thời) Script gọi thử API ở task 1.0. Không commit nếu chứa thông tin nhạy cảm.

### Notes

- Unit test đặt cạnh file được test, ví dụ `aiModels.ts` và `aiModels.test.ts`.
- Dự án dùng test runner của Node qua `tsx`. Chạy `npm test -- path/to/file.test.ts` cho một file, hoặc `npx tsx --test` cho tất cả. Xem cách viết trong `utils/generationModelPreference.test.ts` (`node:test` + `node:assert`).
- Làm theo TDD: viết test, chạy để thấy test **fail**, rồi mới viết code cho test pass.
- Model ID 2.1 phải đi qua **một hằng số duy nhất** (ví dụ `GEMINI_NANO_BANANA_2_1`). Nếu task 1.0 phát hiện ID khác thì chỉ cần sửa một chỗ.
- Sau mỗi task chạy `npx tsc --noEmit` và `npm run lint` (nếu có) để không còn lỗi.

## Instructions for Completing Tasks

**IMPORTANT:** Khi hoàn thành mỗi task, đánh dấu trong file này bằng cách đổi `- [ ]` thành `- [x]`. Cập nhật sau mỗi sub-task, không đợi xong cả parent task.

Ví dụ:

- `- [x] 1.1 Đọc file` → `- [x] 1.1 Đọc file` (sau khi xong)

## Tasks

- [x] 0.0 Tạo feature branch
  - [x] 0.1 Từ `main` mới nhất, chạy `git checkout -b feature/gemini-nano-banana-2-1`.

- [x] 1.0 Xác minh model 2.1 bằng API thật
  - [x] 1.1 Viết script `scripts/verify-nano-banana-2-1.ts` dùng `@google/genai` (giống cách gọi trong `server/routes/generate.ts`). Script gọi `generateContent` với model `gemini-nano-banana-2.1`, prompt đơn giản, ảnh 1K. Đọc `GEMINI_API_KEY` từ env, không hardcode key.
  - [x] 1.2 Chạy script. Nếu API báo model không tồn tại, tra lại ID đúng trên trang Google rồi ghi lại.
  - [x] 1.3 Chạy lại với `imageSize: '512px'`. Ghi lại kết quả: API chấp nhận, hay báo lỗi (kèm nội dung lỗi).
  - [x] 1.4 In toàn bộ `response.usageMetadata`. Kiểm tra có trường `thoughtsTokenCount` (hoặc tương tự) tách riêng thinking tokens không.
  - [x] 1.5 Đo thời gian 5 lần gọi ở ảnh 1K, ghi khoảng min–max (dùng cho task 6.0).
  - [x] 1.6 Ghi kết quả 1.2–1.5 vào mục "Open Questions" của `tasks/prd-gemini-nano-banana-2-1.md` (đánh dấu đã trả lời). Báo lại cho người giao task nếu ID khác `gemini-nano-banana-2.1` hoặc 512px bị lỗi.

- [x] 2.0 Cập nhật danh sách model và logic chọn model Flash trong `constants/aiModels.ts` (TDD)
  - [x] 2.1 Viết test trước trong `constants/aiModels.test.ts`:
    - `normalizeGeminiModelId` chấp nhận đủ 3 ID (2.1, NB2, Pro).
    - `normalizeGeminiModelId` trả 2.1 khi ID lạ, rỗng, `null` hoặc `undefined`.
    - `GEMINI_MODEL_FALLBACK === 'gemini-nano-banana-2.1'`.
  - [x] 2.2 Viết test cho hàm mới `getActiveGeminiFlashModel(adminGeminiModel)`:
    - `adminGeminiModel` là NB2 → trả NB2 (đang rollback).
    - `adminGeminiModel` là 2.1, Pro, `undefined` hoặc ID lạ → trả 2.1.
  - [x] 2.3 Viết test cho danh sách model user thấy, ví dụ `getEnabledModelOptions(enabledProviders, adminGeminiModel)`:
    - Gemini chỉ có 2 mục.
    - Mục đầu là model Flash đang hoạt động, mục sau là Pro.
    - Khi không rollback, NB2 không có trong danh sách.
  - [x] 2.4 Viết test cho `resolveModelKey`:
    - Không có preference → 2.1.
    - Preference `gemini:gemini-3.1-flash-image-preview` → model Flash đang hoạt động (2.1 khi không rollback).
    - Preference Pro → Pro.
    - Khi đang rollback, preference 2.1 → NB2.
  - [x] 2.5 _(Không cần sửa: test chỉ kiểm tra lưu/đọc key, không giả định model mặc định; case map NB2 → 2.1 nằm trong `constants/aiModels.test.ts`.)_ Cập nhật `utils/generationModelPreference.test.ts`: test nào giả định NB2 là mặc định thì đổi sang 2.1. Giữ test lưu/đọc preference.
  - [x] 2.6 Chạy test, xác nhận các test mới **fail**.
  - [x] 2.7 Sửa `aiModels.ts`:
    - Thêm hằng số `GEMINI_NANO_BANANA_2_1`, `GEMINI_NANO_BANANA_2`, `GEMINI_NANO_BANANA_PRO`.
    - Đổi `GEMINI_MODEL_FALLBACK` thành 2.1.
    - Để `ALLOWED_GEMINI_MODEL_IDS` chứa đủ 3 ID, tách khỏi danh sách user thấy.
  - [x] 2.8 Viết `getActiveGeminiFlashModel` và sửa `getEnabledModelOptions` / `resolveModelKey` để nhận thêm `adminGeminiModel` (tham số tuỳ chọn, không làm hỏng chỗ gọi cũ). Preference của Flash cũ hoặc mới đều được map sang model Flash đang hoạt động.
  - [x] 2.9 Chạy lại toàn bộ test, đảm bảo pass.

- [x] 3.0 Server: kiểm tra model ID, rollback, xử lý 512px (TDD)
  - [x] 3.1 Viết test trong `server/lib/resolveGeminiModel.test.ts` cho hàm `resolveGeminiModel({ requestedModel, adminGeminiModel })`:
    - Request Pro → Pro.
    - Request 2.1, admin không rollback → 2.1.
    - Request 2.1, admin chọn NB2 → NB2.
    - Request NB2, admin không rollback → 2.1 (vì user không còn được chọn NB2).
    - Request ID lạ hoặc rỗng → model Flash đang hoạt động.
  - [x] 3.2 Nếu task 1.3 cho thấy 2.1 **không** hỗ trợ 512px: viết thêm test cho `resolveGeminiImageSize(model, imageSize)`. Với 2.1, `'512px'` → `'1K'`. Các model khác giữ nguyên. Nếu 2.1 hỗ trợ 512px thì bỏ qua 3.2 và 3.5, ghi chú lý do.
  - [x] 3.3 Chạy test, xác nhận **fail**.
  - [x] 3.4 Tạo `server/lib/resolveGeminiModel.ts`, dùng lại `getActiveGeminiFlashModel` và `ALLOWED_GEMINI_MODEL_IDS` từ `constants/aiModels.ts` (không copy logic).
  - [x] 3.5 (Nếu cần) Thêm `resolveGeminiImageSize` vào cùng file.
  - [x] 3.6 Trong `server/routes/generate.ts`:
    - Thay dòng 170 bằng `resolveGeminiModel({ requestedModel: body.geminiModel, adminGeminiModel: settings.geminiModel })`.
    - Áp dụng `resolveGeminiImageSize` ở dòng 208 (nếu có).
  - [x] 3.7 (Tuỳ kết quả 1.4) Nếu `usageMetadata` có `thoughtsTokenCount`, trả thêm trường `thinkingTokens` trong JSON response (dòng 229–237). Không đổi tên các trường đang có.
  - [x] 3.8 Chạy toàn bộ test và `npx tsc --noEmit`.

- [ ] 4.0 Client và Admin
  - [x] 4.1 Trong `hooks/useGlobalSettingsAndApiKey.ts`, truyền `globalSettings?.geminiModel` vào `getEnabledModelOptions` và `resolveModelKey`. Nhờ vậy `availableModelOptions` và `getEffectiveModel()` phản ánh trạng thái rollback.
  - [x] 4.2 _(Quyết định không ghi đè: `resolveModelKey` map preference Flash sang model đang hoạt động mỗi lần resolve, nên rollback/bật lại 2.1 đều đúng mà không phải sửa localStorage.)_ Kiểm tra `App.tsx`: khi preference đã lưu là NB2, sau khi resolve phải lưu đè preference mới (2.1), để lần sau không phải map lại. Không được xoá preference của provider khác.
  - [x] 4.3 Trong `hooks/useAdminSettings.ts`, thay chuỗi hardcode ở dòng 17 bằng `GEMINI_MODEL_FALLBACK`.
  - [x] 4.4 Trong `components/admin/AdminSettingsTab.tsx`, đổi dropdown thành 3 option theo thứ tự, dùng các hằng số ID:
    - `Nano Banana 2.1 (mặc định)`
    - `Nano Banana Pro`
    - `Nano Banana 2 (cũ – dùng để rollback)`
  - [x] 4.5 Thêm ghi chú dưới dropdown (`text-xs text-gray-400`): "Chọn Nano Banana 2 để rollback: user sẽ thấy Nano Banana 2 thay cho 2.1."
  - [ ] 4.6 Chạy app (`npm run dev`) và kiểm tra:
    - Dropdown header hiện `GEMINI · Nano Banana 2.1` và `GEMINI · Nano Banana Pro`.
    - Admin đổi sang NB2, reload app user → thấy `GEMINI · Nano Banana 2`.
    - Admin đổi lại 2.1 → user thấy lại 2.1.

  - [x] 4.7 Disable nút 512px trong `ImageSizeSelector` khi model là 2.1 (màn Create theo model đang chọn, màn Merge theo model mặc định của server). Đang chọn 512px thì tự chuyển 1K. Logic dùng chung `getUnsupportedImageSizes` / `resolveGeminiRequestModel` trong `constants/aiModels.ts`.

- [ ] 5.0 Analytics: bảng giá 2.1 (TDD)
  - [x] 5.1 Viết test trong `utils/geminiPricing.test.ts`:
    - `resolveGeminiImagePricing` trả đúng bảng giá cho 2.1 (input 1.5, output ảnh 30, fallback 1K/2K/4K = 0.0336/0.0504/0.113), NB2 (giữ số hiện tại) và Pro (giữ số hiện tại).
    - ID lạ → giá của `GEMINI_MODEL_FALLBACK` (2.1).
    - Fallback 512px của 2.1 = giá 1K (0.0336).
  - [x] 5.2 Nếu task 3.7 có `thinkingTokens`: thêm test hàm `estimateGeminiCost(...)` tính thinking tokens theo $7.50/1M và token ảnh theo $30/1M.
  - [x] 5.3 Chạy test, xác nhận **fail**.
  - [x] 5.4 Tạo `utils/geminiPricing.ts`:
    - Chuyển 2 bảng giá cũ từ `hooks/useImageGeneration.ts` sang và thêm bảng giá 2.1.
    - Viết `resolveGeminiImagePricing` dạng map tường minh theo ID (dùng hằng số từ `aiModels.ts`), không dùng `includes('3-pro-image')`.
    - Cập nhật comment thành `checked 2026-10-08`.
  - [x] 5.5 Trong `hooks/useImageGeneration.ts`, xoá bảng giá cũ và import từ `utils/geminiPricing.ts`. Nếu có `thinkingTokens` thì truyền vào phép tính. Không có thì giữ cách tính hiện tại.
  - [ ] 5.6 Chạy toàn bộ test. Tạo thử 1 ảnh 1K bằng 2.1, kiểm tra `estimatedCost` trong analytics gần $0.0336.

- [ ] 6.0 Popup "So sánh model Gemini"
  - [x] 6.1 Đọc `components/layout/GeminiModelComparisonModal.tsx` để biết chính xác cú pháp markdown được render (tiêu đề, bảng, list, `**bold**`, `` `code` ``).
  - [x] 6.2 Viết lại `docs/so-sanh-model-gemini.md` theo cấu trúc:
    - Tiêu đề và câu mở đầu nhắc 2.1 và Pro.
    - Phần "⏱️ Tóm tắt nhanh".
    - Bảng 2 cột (2.1 | Pro) với các hàng: Model ID, Tốc độ, Chi phí API (1K/2K/4K), Chất lượng ảnh, Chữ tiếng Việt, Sửa ảnh, Độ nhất quán / ảnh tham chiếu, Độ phân giải hỗ trợ.
    - Mục "✨ Điểm mới của Nano Banana 2.1 so với Nano Banana 2" (5 gạch đầu dòng theo FR-14).
    - Phần "💡 Khuyến nghị lựa chọn".
  - [x] 6.3 Hàng "Tốc độ" của 2.1 dùng số đo ở task 1.5. Không có số đo thì ghi "Nhanh (đang cập nhật)". Chi phí lấy đúng theo PRD mục FR-11. Pro giữ số $0.134 (1K/2K) và $0.24 (4K).
  - [x] 6.4 Trong `components/layout/AppHeader.tsx` dòng 219, đổi `title` thành `"So sánh Nano Banana 2.1 và Nano Banana Pro"`.
  - [ ] 6.5 Mở popup trên trình duyệt (desktop và mobile ~375px):
    - Bảng hiển thị đủ, cuộn được.
    - Đóng được bằng X / bấm nền / Escape.
    - Không lộ ký tự markdown thô.

- [ ] 7.0 Tài liệu, kiểm tra thủ công và diễn tập rollback
  - [x] 7.1 Cập nhật `docs/01-overview.md` (dòng 50–51): model mặc định là Nano Banana 2.1 `gemini-nano-banana-2.1`.
  - [x] 7.2 Cập nhật `docs/02-frontend-architecture.md` (dòng 130–131): danh sách model user, hàm `getActiveGeminiFlashModel`, cách map preference cũ.
  - [x] 7.3 Cập nhật `docs/03-backend-api.md` (dòng 84): 3 ID được phép, `resolveGeminiModel` phía server, cơ chế rollback.
  - [x] 7.4 Cập nhật `docs/06-live-deployment.md` (dòng 132) và thêm mục "Rollback Nano Banana 2.1 → 2" gồm:
    - Các bước trong Admin Settings.
    - Cách kiểm tra đã rollback thành công.
    - Cách bật lại 2.1.
  - [x] 7.5 Chạy toàn bộ test (`npx tsx --test`), `npx tsc --noEmit`, `npm run build`. Tất cả phải pass.
  - [ ] 7.6 Kiểm tra thủ công theo `RELEASE_CHECKLIST.md`, tập trung vào:
    - User mới → 2.1.
    - User có preference NB2 trong localStorage → tự chuyển 2.1.
    - User chọn Pro → giữ Pro.
    - Tạo ảnh 1K / 2K / 4K bằng 2.1 thành công.
  - [ ] 7.7 Diễn tập rollback trên staging:
    - Admin chọn NB2 → tạo ảnh từ một tab mở sẵn đang chọn 2.1 → kiểm tra log server gọi `gemini-3.1-flash-image-preview`.
    - Bật lại 2.1, kiểm tra lại.
  - [ ] 7.8 Xoá script tạm `scripts/verify-nano-banana-2-1.ts` (hoặc giữ lại nếu không chứa thông tin nhạy cảm và có ích). Commit theo convention của repo (`feat(models): ...`). Tạo PR có link tới PRD.

- [x] 8.0 Phát sinh sau triển khai (xem `docs/14-nano-banana-2-1-2026-10.md`)
  - [x] 8.1 Thêm cờ `geminiFlashRollback` (`getAdminGeminiModel`) + key trong `firestore.rules`, sửa lỗi header vẫn hiện NB2 do Firestore lưu sẵn ID NB2 cũ.
  - [x] 8.2 `Dockerfile`: `COPY constants ./constants` (container crash `ERR_MODULE_NOT_FOUND`).
  - [x] 8.3 Chuyển Pro và NB2 sang ID GA (`gemini-3-pro-image`, `gemini-3.1-flash-image`), map ID preview cũ qua `canonicalGeminiModelId`.
  - [x] 8.4 Disable 512px cho Pro (API trả 400).
  - [x] 8.5 Sửa popup cho khớp docs (ảnh tham chiếu, giữ nhân vật nhất quán).
  - [ ] 8.6 Deploy Firestore rules → deploy app → smoke test (header 2.1, popup, 512px disable, tạo ảnh).
