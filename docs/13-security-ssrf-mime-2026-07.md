# 13. Security hardening 2026-07 — SSRF (DNS rebinding) & MIME upload

Bổ sung cho `docs/10-security-hardening-2026-06.md`. Tất cả thay đổi làm theo TDD
(Red → Green → Refactor). Trạng thái sau cùng: **55/55 test pass**, `tsc --noEmit` sạch.

---

## 1. Upload MIME allowlist — `utils/fileValidation.ts`

**Trước:**

```typescript
export function isAcceptedImageFile(file: File): boolean {
  return file.type.startsWith('image/'); // ⚠️ cho qua mọi image/*
}
```

`accept="image/png, image/jpeg, image/webp"` chỉ lọc UI của file picker; drag-drop
và code thực tế dùng `isAcceptedImageFile` làm cổng. Hàm này cho qua **mọi**
`image/*`, gồm `image/svg+xml` (rủi ro stored-XSS) và `image/gif`.

**Sau:** allowlist lấy từ chính `ACCEPTED_IMAGE_TYPES` (một nguồn chân lý):

```typescript
const ACCEPTED_IMAGE_MIME_TYPES = new Set(
  ACCEPTED_IMAGE_TYPES.split(',').map((type) => type.trim())
);
export function isAcceptedImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_MIME_TYPES.has(file.type); // chỉ png/jpeg/webp
}
```

**Cổng dùng:** `ImageUploader`, `MaskUploader`, `ReferenceImageUploader`.
**Test:** `utils/fileValidation.test.ts` (png/jpeg/webp pass; svg/gif/pdf/empty reject).

---

## 2. SSRF — DNS rebinding & redirect cho provider base URL

### Vì sao check cũ chưa đủ

`§5b` của doc 10 thêm `validateHttpsBaseUrl` (parse + bắt buộc `https:`), phiên này
mở rộng thành chặn **literal host nội bộ**. Nhưng kiểm-theo-chuỗi vẫn còn 2 lỗ hổng
vì base URL do người dùng cấp rồi server tự `fetch()`:

1. **DNS rebinding (TOCTOU):** `https://evil.example.com` (host public, PASS) có
   TTL thấp; giữa lúc validate và lúc `fetch`, DNS đổi bản ghi sang
   `169.254.169.254` / `127.0.0.1` / `10.x` → server kết nối nội bộ.
2. **Redirect-based SSRF:** host public trả `302 Location: http://169.254.169.254/…`
   → `fetch` mặc định tự follow → kết nối nội bộ.

Cả hai chỉ chặn được ở **tầng kết nối** (kiểm IP thực sẽ connect), không phải tầng chuỗi.

### Kiến trúc 2 lớp

| Lớp | File | Vai trò |
|-----|------|---------|
| Chặn sớm | `server/lib/validateBaseUrl.ts` | parse + `https:` + literal host nội bộ → HTTP 400 |
| Chặn tầng kết nối | `server/lib/ssrfSafeFetch.ts` | guarded DNS lookup + tiền kiểm literal IP + cấm redirect + timeout |
| Dùng chung | `server/lib/ipRanges.ts` | `isBlockedIp()` — dải IP nội bộ IPv4/IPv6 |

`isBlockedIp` chặn: IPv4 `0/8` `10/8` `127/8` `169.254/16` (metadata) `172.16/12`
`192.168/16` `100.64/10` (CGNAT) `198.18/15` (benchmark) `224/4`+ (multicast/reserved);
IPv6 `::1` `::` `fc00::/7` `fe80::/10` `ff00::/8` và IPv4-mapped `::ffff:a.b.c.d`.

### `ssrfSafeFetch`

```typescript
// Guarded DNS lookup gắn vào undici Agent: phân giải TẤT CẢ địa chỉ, chặn nếu có
// địa chỉ nội bộ, rồi connect vào chính địa chỉ trả về -> đóng khe TOCTOU rebinding.
const ssrfAgent = new Agent({ connect: { lookup: makeGuardedLookup(), timeout: 10_000 } });

await ssrfSafeFetch(url, init); // redirect: 'error' + dispatcher: ssrfAgent + timeout 15s
```

Chi tiết quan trọng:
- **Dùng `fetch` của undici** (không phải global fetch của Node): package `undici`
  cài riêng không tương thích Dispatcher của undici bundled trong Node
  (`invalid onRequestStart method`) → phải để Agent + fetch cùng một phiên bản.
- **Tiền kiểm literal IP:** undici bỏ qua `connect.lookup` khi host là IP literal,
  nên `ssrfSafeFetch` tự kiểm literal nội bộ trước khi gọi fetch (an toàn độc lập,
  không phụ thuộc caller).
- **Escape hatch:** `SSRF_ALLOWED_HOSTS` (phân tách bằng dấu phẩy, mặc định rỗng)
  cho phép host nội bộ hợp pháp khi tự host provider trong mạng riêng.
- **Lỗi:** guard ném `Error` có `code = 'SSRF_BLOCKED'`; `generate.ts` và
  `providerTest.ts` map (kể cả qua `error.cause`) sang **HTTP 400**.

### Giới hạn còn lại

Kiểm ở tầng kết nối đã chặn rebinding cho hostname phân giải ra IP nội bộ. Không có
giới hạn TOCTOU vì địa chỉ được kiểm là địa chỉ dùng để connect. Redirect bị chặn
hoàn toàn (`redirect: 'error'`). Nếu sau này cần **cho phép** redirect, phải chuyển
sang vòng lặp thủ công re-validate từng hop.

### Kiểm chứng E2E (qua undici thật)

```
https://localhost:8443    -> SSRF_BLOCKED   (hostname -> ::1, guard lookup)
https://169.254.169.254   -> SSRF_BLOCKED   (metadata, tiền kiểm literal)
https://10.0.0.1          -> SSRF_BLOCKED   (private, tiền kiểm literal)
https://[::1]:8443        -> SSRF_BLOCKED   (IPv6 loopback)
https://example.com       -> HTTP 200       (public: KHÔNG chặn nhầm)
```

**Test:** `server/lib/ipRanges.test.ts`, `server/lib/ssrfSafeFetch.test.ts`,
`server/lib/validateBaseUrl.test.ts`.
**Dependency mới:** `undici`.

---

## Trạng thái sau hardening (2026-07-20)

| Kiểm tra | Kết quả |
|----------|---------|
| `npm run lint` (`tsc --noEmit`) | ✅ 0 errors |
| `npm test` | ✅ 55/55 pass (12 suites) |
| SSRF vector nội bộ (literal + rebinding + redirect) | ✅ chặn `SSRF_BLOCKED` |
| Host public hợp lệ | ✅ không chặn nhầm |

Tài liệu liên quan: `docs/10-security-hardening-2026-06.md` · `docs/03-backend-api.md` · `docs/05-security-roles.md`
