# Tasks: Vá lỗ hổng TDD — Nano Banana 2.1

Nguồn: kết quả rà TDD ngày 2026-10-08 (mutation test 13 lần, 1 lần lọt đã được vá). File này vá các phần **chưa có test tự động** và các bước kiểm tra thủ công còn mở trong `tasks/tasks-gemini-nano-banana-2-1.md`.

**Nguyên tắc chung:** với mỗi sub-task, làm theo thứ tự sau:
1. **RED:** viết test, chạy và xác nhận test fail ở assertion vì đúng lý do (không phải fail vì lỗi import).
2. **GREEN:** viết code tối thiểu để test pass.
3. **Chạy toàn bộ:** `npx tsx --test`, sau đó `npx tsc --noEmit`.
4. **Mutation:** cố tình làm hỏng logic vừa viết, xác nhận test fail, rồi khôi phục.

Không thêm thư viện mới. Máy không có Java nên không dùng Firestore emulator.

## Relevant Files

- `utils/adminSettingsPayload.ts` (mới) + `.test.ts`: dữ liệu ghi vào `settings/global`, gồm cờ `geminiFlashRollback`.
- `hooks/useAdminSettings.ts`: dùng payload builder ở trên.
- `firestore.rules`, `firestore.rules.test.ts` (mới): kiểm tra tĩnh danh sách key `hasOnly` của `settings/global`.
- `components/ImageSizeSelector.tsx`, `components/imageSizeOptions.ts` (mới) + `.test.ts`, `components/ImageSizeSelector.test.tsx` (mới, render SSR).
- `server/lib/geminiResponse.ts` (mới) + `.test.ts`: dựng response và cấu hình ảnh cho Gemini.
- `server/routes/generate.ts`: dùng các helper ở trên.
- `utils/generationUsage.ts` (mới) + `.test.ts`: cộng dồn token phía client.
- `hooks/useImageGeneration.ts`, `services/geminiService.ts`: dùng các helper ở trên.
- `scripts/dockerfileCoverage.test.ts` (mới): kiểm tra Dockerfile `COPY` đủ các thư mục server import.

## Tasks

- [x] 1.0 Trang Admin ghi cờ `geminiFlashRollback` đúng (rủi ro cao nhất)
  - [x] 1.1 RED: viết test cho `buildGlobalSettingsPayload(normalized, now)`:
    - Chọn NB2 → `geminiFlashRollback: true`.
    - Chọn 2.1 hoặc Pro → `false`.
    - Luôn có `updatedAt`.
    - Không có key nào ngoài danh sách `GLOBAL_SETTINGS_WRITE_KEYS`.
  - [x] 1.2 GREEN: tạo `utils/adminSettingsPayload.ts` (export `GLOBAL_SETTINGS_WRITE_KEYS`). Bỏ object ghi trực tiếp trong `handleSaveSettings` và gọi builder.
  - [x] 1.3 Mutation: đổi điều kiện thành `!==` hoặc luôn `false` → test phải fail.

- [x] 2.0 Firestore rules cho phép đủ key app ghi (sự cố "Admin không lưu được" khi rules thiếu key)
  - [x] 2.1 RED: viết `firestore.rules.test.ts`:
    - Đọc `firestore.rules`, parse danh sách trong `isSafeGlobalSettings()` → `hasOnly([...])`.
    - Assert danh sách đó chứa mọi key trong `GLOBAL_SETTINGS_WRITE_KEYS`.
    - Xác nhận RED bằng cách tạm xoá `'geminiFlashRollback'` khỏi rules.
  - [x] 2.2 GREEN: rules hiện đã đúng. Test pass sau khi khôi phục.
  - [x] 2.3 Ghi chú trong test: đây là kiểm tra tĩnh. Muốn test hành vi rules thật cần emulator, tức phải cài Java và `@firebase/rules-unit-testing` (để mở).

- [x] 3.0 `ImageSizeSelector` disable 512px và tự chuyển về 1K
  - [x] 3.1 RED: tách logic thuần ra `components/imageSizeOptions.ts`. Viết test:
    - `getImageSizeOptions(unsupported)` trả `{ size, disabled }` cho 4 size.
    - `resolveSupportedImageSize(size, unsupported)` trả `'1K'` khi size không hỗ trợ, ngược lại giữ nguyên.
  - [x] 3.2 RED: viết `ImageSizeSelector.test.tsx`. Dùng `renderToStaticMarkup` (`react-dom/server`, không thêm thư viện) để assert nút 512px có thuộc tính `disabled` và tooltip khi `unsupportedSizes=['512px']`, còn 1K thì không.
  - [x] 3.3 GREEN: component dùng hai hàm trên (`useEffect` gọi `resolveSupportedImageSize`).
  - [x] 3.4 Mutation: bỏ `disabled` hoặc trả nguyên size → test phải fail.
  - [x] 3.5 Ghi chú: `useEffect` không chạy khi render SSR, nên phần tự chuyển 1K được test qua hàm thuần. Phần nối hàm vào component kiểm tra thủ công ở task 7.0.

- [x] 4.0 Server: cấu hình ảnh và response Gemini (`thinkingTokens`)
  - [x] 4.1 RED: viết test cho `server/lib/geminiResponse.ts`:
    - `buildGeminiImageConfig({ model, aspectRatio, imageSize })`: mặc định `1:1`/`1K`, nâng 512px lên 1K cho 2.1 và Pro.
    - `buildGeminiUsage(usageMetadata)`: map `promptTokens`, `completionTokens`, `thinkingTokens` (từ `thoughtsTokenCount`), `totalTokens` (dùng `totalTokenCount`, thiếu thì tự cộng cả thinking).
    - Dùng số liệu thật đã đo: prompt 9, candidates 1337, thoughts 619, total 1965.
  - [x] 4.2 GREEN: tạo helper, `generate.ts` gọi helper thay cho code viết thẳng trong route.
  - [x] 4.3 Mutation: bỏ `thinkingTokens` hoặc bỏ thinking khỏi tổng tự cộng → test phải fail.
  - [x] 4.4 Ghi chú: phần route còn lại (Express, Firestore, `GoogleGenAI`) không viết test, vì chỉ nối các helper đã có test, và muốn test phải inject phụ thuộc, việc đó nằm ngoài phạm vi.

- [x] 5.0 Client: nhận và cộng dồn token (`geminiService` + `useImageGeneration`)
  - [x] 5.1 RED: viết test cho `utils/generationUsage.ts`:
    - `mapGenerateResponse(prompt, data)`: map đủ `promptTokens`, `completionTokens`, `thinkingTokens`, `totalTokens`, các trường thiếu thành 0.
    - `sumGenerationUsage(results)`: cộng 4 loại token, bỏ qua ảnh lỗi (`imageUrl === 'error'`).
  - [x] 5.2 GREEN: `geminiService` và `useImageGeneration` gọi các helper này.
  - [x] 5.3 Mutation: bỏ `thinkingTokens` trong map hoặc trong tổng → test phải fail.

- [x] 6.0 Dockerfile `COPY` đủ thư mục server import (sự cố `ERR_MODULE_NOT_FOUND /app/constants`)
  - [x] 6.1 RED: viết `scripts/dockerfileCoverage.test.ts`:
    - Đi theo các import tương đối từ `server.ts`, chỉ lấy những file thực sự được nạp lúc chạy, bỏ qua `import type`.
    - Gom các thư mục top-level được dùng.
    - Assert stage production của `Dockerfile` có `COPY` từng thư mục đó.
    - Xác nhận RED bằng cách tạm xoá `COPY constants ./constants`.
  - [x] 6.2 GREEN: Dockerfile hiện đã đúng. Test pass sau khi khôi phục.

- [ ] 7.0 Kiểm tra thủ công và deploy (cần bạn: đăng nhập Google/admin, staging)
  - [ ] 7.1 Deploy Firestore rules → deploy app (task 8.6 trong file task chính).
  - [ ] 7.2 Bản live, tài khoản user:
    - Header hiện `GEMINI · Nano Banana 2.1`.
    - Popup hiện Model ID Pro là `gemini-3-pro-image`.
    - Chọn 512px với NB2 rồi đổi sang 2.1 hoặc Pro → tự về 1K, nút 512px mờ đi.
    - Tạo ảnh 1K, 2K, 4K với 2.1.
    - Màn Merge: nút 512px bị disable.
  - [ ] 7.3 Analytics: ảnh 1K tạo bằng 2.1 có `estimatedCost` khoảng $0.035–0.04 (gồm thinking).
  - [ ] 7.4 Chạy thử rollback trên staging:
    - Admin chọn NB2 → Firestore có `geminiFlashRollback: true` → user thấy NB2.
    - Tab mở sẵn đang chọn 2.1 tạo ảnh → server gọi `gemini-3.1-flash-image`.
    - Bật lại 2.1.
  - [ ] 7.5 Đánh dấu task 4.6, 5.6, 6.5, 7.6, 7.7, 8.6 trong `tasks/tasks-gemini-nano-banana-2-1.md`.

- [ ] 8.0 Hoàn tất
  - [x] 8.1 Chạy lại mutation script cho toàn bộ logic (cũ và mới): mọi mutation đều phải bị test bắt.
  - [x] 8.2 `npx tsx --test`, `npx tsc --noEmit`, `npm run build` đều sạch. Cập nhật số test trong `docs/06-live-deployment.md` và `docs/14-nano-banana-2-1-2026-10.md`.
  - [x] 8.3 Commit (gồm cả 2 test vá mutation trong `constants/aiModels.test.ts` đang chưa commit).
