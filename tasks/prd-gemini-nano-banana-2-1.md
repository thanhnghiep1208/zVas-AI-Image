# PRD: Nâng cấp model tạo ảnh lên Gemini Nano Banana 2.1

## 1. Giới thiệu / Tổng quan

Google vừa phát hành **Gemini Nano Banana 2.1** (model ID `gemini-nano-banana-2.1`, trạng thái GA), bản kế nhiệm của **Nano Banana 2** (`gemini-3.1-flash-image-preview`) mà app đang dùng làm model mặc định.

So với Nano Banana 2, bản 2.1:

- Ảnh đẹp và chân thực hơn ở cả 1K, 2K, 4K.
- Viết chữ trong ảnh và vẽ infographic chính xác hơn.
- Hết lỗi ảnh bị lặp ô (tiling) ở các tỷ lệ panorama.
- Giữ nhân vật/vật thể nhất quán tốt hơn (tối đa 14 ảnh tham chiếu: 4 nhân vật + 10 vật thể).
- **Rẻ hơn khoảng 50%/ảnh**, ví dụ $0.0336 so với $0.067 cho ảnh 1K.

**Mục tiêu:** thay Nano Banana 2 bằng Nano Banana 2.1 trong dropdown của user, đặt 2.1 làm mặc định, cập nhật popup "So sánh model Gemini" và bảng giá tính chi phí trong analytics. Admin vẫn quay lại Nano Banana 2 được nếu 2.1 gặp sự cố.

Tài liệu tham khảo:
- Model: https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1
- Giá: https://ai.google.dev/gemini-api/docs/pricing#gemini-nano-banana-2.1

## 2. Mục tiêu (Goals)

1. 100% user mới, và user chưa chủ động chọn Pro, tạo ảnh bằng Nano Banana 2.1 ngay sau khi release.
2. User thường không còn thấy Nano Banana 2 trong dropdown chọn model.
3. Admin chuyển model Flash từ 2.1 về Nano Banana 2 (rollback) được trong vòng < 1 phút, **không cần deploy lại**.
4. Chi phí ước tính trong analytics của ảnh tạo bằng 2.1 khớp với bảng giá chính thức của Google (sai lệch < 5% so với hoá đơn thực tế).
5. Popup so sánh model mô tả đúng hai lựa chọn hiện có (2.1 và Pro), kèm mục "Điểm mới của 2.1 so với 2".

## 3. User Stories

- **Là user tạo ảnh**, tôi muốn app mặc định dùng model mới nhất, rẻ nhất, để có ảnh đẹp hơn mà không phải tự tìm hiểu.
- **Là user đã từng chọn Nano Banana 2**, tôi muốn lựa chọn của mình tự chuyển sang 2.1, để không bị kẹt ở model cũ hay gặp lỗi model không hợp lệ.
- **Là user đang phân vân giữa các model**, tôi muốn bấm nút info để đọc so sánh 2.1 với Pro và biết 2.1 có gì mới so với bản 2.
- **Là admin**, tôi muốn chọn model Flash dùng chung (2.1 hoặc 2) trong trang Admin Settings, để rollback ngay khi 2.1 lỗi hoặc chất lượng kém mà không cần nhờ dev deploy.
- **Là admin xem analytics**, tôi muốn chi phí ảnh 2.1 được tính đúng đơn giá của 2.1, để báo cáo chi phí không bị sai.

## 4. Yêu cầu chức năng (Functional Requirements)

### 4.1. Danh sách model và giá trị mặc định

**FR-1.** Thêm Nano Banana 2.1 vào [constants/aiModels.ts](../constants/aiModels.ts) với `value: 'gemini-nano-banana-2.1'` và `label: 'Nano Banana 2.1'`.

**FR-2.** Đổi `GEMINI_MODEL_FALLBACK` thành `'gemini-nano-banana-2.1'`. Fallback hardcode ở [server/routes/generate.ts:170](../server/routes/generate.ts#L170) và giá trị khởi tạo ở [hooks/useAdminSettings.ts:17](../hooks/useAdminSettings.ts#L17) cũng phải dùng hằng số này, không ghi chuỗi cứng nữa.

**FR-3.** Danh sách model Gemini cho **user** (dropdown trên header, `PROVIDER_MODEL_OPTIONS.gemini`) chỉ có 2 mục theo thứ tự:
1. Model Flash đang được admin chọn: mặc định Nano Banana 2.1, hoặc Nano Banana 2 khi đang rollback (xem FR-7).
2. Nano Banana Pro.

Mục đầu tiên là model mặc định khi user chưa có lựa chọn (logic `resolveModelKey` lấy `options[0]` giữ nguyên).

**FR-4.** `ALLOWED_GEMINI_MODEL_IDS` vẫn **chứa đủ cả 3 ID** (`gemini-nano-banana-2.1`, `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`). Mục đích là để admin vẫn chọn và lưu được Nano Banana 2, và server vẫn chấp nhận ID này khi rollback.

### 4.2. Chuyển lựa chọn cũ của user

**FR-5.** User có preference đã lưu là Nano Banana 2 (localStorage key `preferred_generation_models`, giá trị `gemini:gemini-3.1-flash-image-preview`) phải tự được chuyển sang model Flash đang hoạt động (FR-3) khi app load. User không thấy lỗi và không phải chọn lại.

**FR-6.** User có preference là Nano Banana Pro thì giữ nguyên Pro.

### 4.3. Rollback cho admin (feature flag)

**FR-7.** Trong [components/admin/AdminSettingsTab.tsx](../components/admin/AdminSettingsTab.tsx), dropdown model Gemini hiển thị 3 lựa chọn:
- `Nano Banana 2.1 (mặc định)`
- `Nano Banana Pro`
- `Nano Banana 2 (cũ – dùng để rollback)`

Giá trị được lưu vào `settings/global.geminiModel` trên Firestore như hiện tại.

**FR-8.** Model Flash hiển thị cho user (mục 1 ở FR-3) được quyết định như sau:
- Admin chọn `gemini-3.1-flash-image-preview`: model Flash là **Nano Banana 2**. Đây là trạng thái rollback.
- Admin chọn 2.1 hoặc Pro: model Flash là **Nano Banana 2.1**.

Khi admin đổi lựa chọn, user nhận cấu hình mới ở lần load app hoặc lần đọc settings kế tiếp, **không cần deploy**.

**FR-9.** Khi đang rollback, mọi request tạo ảnh có `geminiModel = 'gemini-nano-banana-2.1'` phải được server chuyển sang `gemini-3.1-flash-image-preview`. Làm vậy để tab nào đã mở sẵn từ trước vẫn gọi đúng model đã rollback.

**FR-10.** Server ở [server/routes/generate.ts](../server/routes/generate.ts) phải kiểm tra `body.geminiModel` có thuộc `ALLOWED_GEMINI_MODEL_IDS` hay không. ID không hợp lệ thì dùng `normalizeGeminiModelId` để quay về fallback. Hiện server chưa kiểm tra chỗ này.

### 4.4. Tính chi phí (analytics)

**FR-11.** Thêm bảng giá 2.1 vào [hooks/useImageGeneration.ts](../hooks/useImageGeneration.ts) (Standard tier, kiểm tra ngày 2026-10-08):

| Hạng mục | Giá |
| :--- | :--- |
| Input (text/image) | $1.50 / 1M token |
| Output ảnh | $30.00 / 1M token |
| Output text/thinking | $7.50 / 1M token |
| Ước tính theo ảnh 1K (fallback) | $0.0336 |
| Ước tính theo ảnh 2K (fallback) | $0.0504 |
| Ước tính theo ảnh 4K (fallback) | $0.113 |

**FR-12.** Hàm `resolveGeminiImagePricing` phải so khớp **từng model một cách tường minh**: 2.1, Flash 3.1 (Nano Banana 2) và Pro. Không được dựa vào kiểu "không phải Pro thì là Flash" như hiện nay. Model không nhận diện được thì dùng giá của `GEMINI_MODEL_FALLBACK`.

**FR-13.** Cập nhật dòng comment ghi ngày kiểm tra giá thành `checked 2026-10-08`.

### 4.5. Popup "So sánh model Gemini"

**FR-14.** Viết lại [docs/so-sanh-model-gemini.md](../docs/so-sanh-model-gemini.md), file mà `GeminiModelComparisonModal` đọc qua `?raw`, gồm các phần:
1. **Tóm tắt nhanh:** nên chọn bản nào giữa **Nano Banana 2.1** và **Nano Banana Pro**.
2. **Bảng so sánh 2 cột** (2.1 và Pro) với các hàng: Model ID, Tốc độ, Chi phí API (theo ảnh 1K/2K/4K), Chất lượng ảnh, Chữ tiếng Việt, Sửa ảnh, Độ nhất quán / ảnh tham chiếu, Độ phân giải hỗ trợ.
3. **Mục mới "✨ Điểm mới của Nano Banana 2.1 so với Nano Banana 2":**
   - Ảnh đẹp và chân thực hơn ở 1K/2K/4K.
   - Hết lỗi lặp ô ở tỷ lệ panorama.
   - Viết chữ và infographic chính xác hơn.
   - Nhận tối đa 14 ảnh tham chiếu (4 nhân vật + 10 vật thể).
   - Giá ảnh 1K giảm từ $0.067 xuống $0.0336.
4. **Khuyến nghị lựa chọn:** dùng 2.1 khi nào, dùng Pro khi nào.

**FR-15.** Nội dung chỉ được dùng cú pháp markdown mà modal đang render: tiêu đề, bảng, list, `**bold**`, `` `code` ``. Không thêm cú pháp mới như ảnh, link HTML hay blockquote lồng nhau.

**FR-16.** Số liệu tốc độ của 2.1 phải được **đo thực tế** (gọi tối thiểu 5 lần ở ảnh 1K, ghi lại khoảng thời gian). Không có số đo thì ghi "Nhanh (đang cập nhật)". Không tự đặt ra số liệu.

**FR-17.** Đổi `title` của nút info ở [components/layout/AppHeader.tsx:219](../components/layout/AppHeader.tsx#L219) thành `"So sánh Nano Banana 2.1 và Nano Banana Pro"`.

### 4.6. Tài liệu và test

**FR-18.** Cập nhật các chỗ nhắc tới "Nano Banana 2 là mặc định" hoặc liệt kê model trong: [docs/01-overview.md](../docs/01-overview.md), [docs/02-frontend-architecture.md](../docs/02-frontend-architecture.md), [docs/03-backend-api.md](../docs/03-backend-api.md), [docs/06-live-deployment.md](../docs/06-live-deployment.md). Thêm hướng dẫn rollback (FR-7, FR-8) vào `06-live-deployment.md`.

**FR-19.** Viết test theo hướng TDD, viết test trước rồi mới code:
- Cập nhật [utils/generationModelPreference.test.ts](../utils/generationModelPreference.test.ts).
- `normalizeGeminiModelId`: chấp nhận cả 3 ID, ID lạ thì trả về 2.1.
- `resolveModelKey`: không có preference thì ra 2.1; preference NB2 thì chuyển sang model Flash đang hoạt động; preference Pro thì giữ Pro.
- Tính model Flash cho user theo setting admin (FR-8), test cả trạng thái thường và rollback.
- `resolveGeminiImagePricing`: trả đúng bảng giá cho từng ID, kể cả ID không nhận diện được.
- Server: request 2.1 khi đang rollback phải được chuyển sang NB2; ID không hợp lệ phải quay về fallback.

## 5. Ngoài phạm vi (Non-Goals)

- **Không** thêm tỷ lệ ảnh mới (1:4, 4:1, 1:8, 8:1) vào phần chọn tỷ lệ. Để task khác.
- **Không** thêm tuỳ chọn mức thinking (minimal/medium/high) trên UI.
- **Không** dùng Batch API (giá rẻ hơn 50%).
- **Không** tăng giới hạn số ảnh tham chiếu user được upload lên 14.
- **Không** đổi model ID của Nano Banana 2 (`gemini-3.1-flash-image-preview`) hay Nano Banana Pro.
- **Không** tính lại chi phí cho dữ liệu analytics cũ đã lưu.
- **Không** xoá code hỗ trợ Nano Banana 2. Bản 2 vẫn là phương án rollback.

## 6. Thiết kế (Design Considerations)

- Dropdown header giữ nguyên format `GEMINI · <label>`. Nhãn hiển thị là `GEMINI · Nano Banana 2.1`.
- Popup so sánh giữ nguyên layout hiện tại (`max-w-[820px]`, portal vào `document.body`, đóng bằng X / bấm nền / Escape). Chỉ thay nội dung markdown.
- Mục "Điểm mới của 2.1 so với 2" đặt **sau bảng so sánh**, trước phần khuyến nghị. Dùng list ngắn tối đa 5 dòng để đọc nhanh trên mobile.
- Trong Admin Settings, thêm một dòng ghi chú nhỏ (`text-xs text-gray-400`) dưới dropdown: *"Chọn Nano Banana 2 để rollback: user sẽ thấy Nano Banana 2 thay cho 2.1."*

## 7. Lưu ý kỹ thuật (Technical Considerations)

- **Chỗ cần xác minh model ID:** trang tài liệu của Google ghi ID là `gemini-nano-banana-2.1`, khác kiểu đặt tên cũ (`gemini-3.1-flash-image-preview`). Trước khi code, chạy một request thật qua `@google/genai` với ID này để xác nhận. Nếu ID khác, chỉ cần sửa ở `constants/aiModels.ts` (FR-2 đã gom fallback về một hằng số).
- **Độ phân giải 512px:** app có size `512px` ([components/ImageSizeSelector.tsx](../components/ImageSizeSelector.tsx)), nhưng tài liệu 2.1 chỉ nêu 1K/2K/4K và bảng giá cũng không có mức 512px. Cần thử gọi 2.1 với 512px:
  - Nếu API trả lỗi, server phải tự nâng lên `1K` khi model là 2.1. Ghi nhận cách xử lý này trong PR.
  - Fallback giá cho 512px của 2.1 dùng mức giá 1K.
- **Thinking tokens:** 2.1 tính output text/thinking ($7.50/1M) khác output ảnh ($30/1M). Hiện server chỉ trả `completionTokens` tổng. Nếu `usageMetadata` có tách riêng thinking tokens (`thoughtsTokenCount`) thì nên tính riêng. Nếu không, chấp nhận tính toàn bộ theo giá output ảnh và ghi chú lại.
- **Đọc setting admin phía client:** setting được đọc qua `useGlobalSettingsAndApiKey` / `getEffectiveModel()`. Logic chọn model Flash (FR-8) nên viết thành **một hàm thuần** trong `constants/aiModels.ts` để client và server dùng chung và dễ test.
- **Thứ tự triển khai đề xuất:**
  1. Xác minh model ID và 512px.
  2. Viết test.
  3. Sửa `aiModels.ts`.
  4. Sửa server.
  5. Sửa client và admin.
  6. Cập nhật bảng giá.
  7. Viết lại popup và docs.
  8. Kiểm tra thủ công theo `RELEASE_CHECKLIST.md`.

## 8. Chỉ số thành công (Success Metrics)

- Trong 7 ngày đầu sau release, ≥ 90% lượt tạo ảnh Gemini không phải Pro dùng `gemini-nano-banana-2.1` (đo qua analytics theo trường model).
- Tỷ lệ lỗi tạo ảnh của 2.1 không cao hơn Nano Banana 2 của 7 ngày trước release (theo Sentry / log lỗi).
- Chi phí Gemini trung bình mỗi ảnh 1K giảm khoảng 50% so với tháng trước.
- Không có ticket nào về "model không hợp lệ" hoặc "mất lựa chọn model" sau release.
- Thao tác rollback (FR-7) được diễn tập ít nhất 1 lần trên môi trường staging trước khi release.

## 9. Câu hỏi còn mở (Open Questions)

1. ~~Model ID chính xác có đúng là `gemini-nano-banana-2.1` không?~~ **Đã xác minh 2026-10-08:** đúng, gọi API tạo ảnh thành công.
2. ~~2.1 có hỗ trợ độ phân giải 512px không?~~ **Đã xác minh 2026-10-08:** không. API trả 400 `Image size 512px is not supported for this model`. Server tự nâng lên 1K. **Quyết định:** disable nút 512px trên UI khi model là 2.1, tự chuyển về 1K nếu đang chọn 512px.
   - **Thinking tokens:** `usageMetadata` có `thoughtsTokenCount` (ví dụ 619), tách riêng khỏi `candidatesTokenCount` (1337, trong đó 1120 là token ảnh theo `candidatesTokensDetails`).
   - **Tốc độ đo thực tế:** 5 lần ảnh 1K mất 12.4–14.5 giây.
3. Bảng giá của Google ghi ID Nano Banana 2 là `gemini-3.1-flash-image` (không có `-preview`). Bản preview có bị ngừng hỗ trợ không, và khi nào? Nếu có thì phương án rollback cần đổi ID.
4. Khi rollback về NB2, user đang dùng Pro có cần được thông báo gì không? Đề xuất: không cần.
5. Có cần hiển thị badge "Mới" cạnh Nano Banana 2.1 trong dropdown trong một khoảng thời gian không?

## 10. Cập nhật sau triển khai (2026-10-08)

Một số yêu cầu đã thay đổi trong lúc triển khai. Chi tiết xem `docs/14-nano-banana-2-1-2026-10.md`.

- **FR-1, FR-4, Non-Goals (không đổi ID NB2/Pro):** đã đổi. Theo docs image-generation, Pro dùng `gemini-3-pro-image` và Nano Banana 2 dùng `gemini-3.1-flash-image` (GA). ID preview cũ tự được đổi sang ID GA (`canonicalGeminiModelId`). Open Question 3 đã được trả lời.
- **FR-7, FR-8 (rollback):** không suy ra rollback từ `geminiModel` nữa. Rollback chỉ có hiệu lực khi `settings/global.geminiFlashRollback === true`, vì Firestore đã lưu sẵn `geminiModel = gemini-3.1-flash-image-preview` (giá trị mặc định cũ) và bị hiểu nhầm là đang rollback. Cần thêm key này vào `firestore.rules`.
- **512px:** Pro cũng không hỗ trợ 512px (API trả 400). UI disable 512px cho cả 2.1 và Pro, server nâng lên 1K.
- **Popup:** ảnh tham chiếu theo docs (2.1: 10 vật thể + 4 nhân vật + 3 ảnh style; Pro: 6 vật thể, không tối ưu giữ nhân vật nhất quán). Bỏ ý "14 ảnh tham chiếu" khỏi mục điểm mới.
- **Deploy:** `Dockerfile` phải `COPY constants ./constants`.
