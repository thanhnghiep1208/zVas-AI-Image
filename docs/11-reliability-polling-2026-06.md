# 11 - Phase 2: Reliability & Polling Centralization (06/2026)

Ngày: 2026-06-19. Ghi lại các thay đổi liên quan đến độ tin cậy server và tập trung hóa timer polling trên client.

---

## 1. Health Check Endpoint `/_health`

**Vấn đề:** Firebase App Hosting chặn path `/healthz` ở tầng infrastructure (nginx ingress) — request không bao giờ tới Express. Cloud Run dùng path này để kiểm tra sức khỏe container.

**Giải pháp:** Thêm endpoint `/_health` (underscore prefix), đặt trước `registerApiRoutes`:

```typescript
// server.ts
app.get('/_health', (_req, res) => {
  res.json({ status: 'ok' });
});
```

**Lưu ý:** Dùng `/_health`, không dùng `/healthz` hay `/health` — Firebase App Hosting intercepting là behavior ở infra level, không phải bug trong code.

---

## 2. Express 5 SPA Catch-All Fix

**Vấn đề:** `app.get('*all', ...)` không phải syntax đúng của Express 5 cho wildcard catch-all. Dẫn đến một số path (ví dụ `/healthz` không trailing slash) không được catch và trả về 404 từ Express (thực ra Google 404 từ infra).

**Sửa:**

```typescript
// Trước (Express 4 style, không hợp lệ Express 5)
app.get('*all', (_req, res) => { ... });

// Sau (Express 5 đúng)
app.get('/*path', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
```

---

## 3. Graceful SIGTERM Shutdown (Cloud Run)

Cloud Run gửi `SIGTERM` và chờ tối đa 10 giây trước khi `SIGKILL`. Cần:
- Dừng nhận connection mới ngay lập tức (`server.close()`).
- Cho phép requests đang xử lý finish.
- Force exit sau 8 giây (buffer 2s trước deadline SIGKILL).

```typescript
// server.ts
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
```

---

## 4. Firestore TTL — Restore `rate_limit_windows.expireAt`

**Vấn đề:** Trong một lần `firebase deploy --only firestore:indexes`, CLI hỏi có xóa các field overrides không có trong file hay không. User chọn "Yes" → TTL của `rate_limit_windows.expireAt` bị xóa → documents rate limit **không tự động xóa** sau khi hết hạn.

**Sửa:** Đảm bảo `firestore.indexes.json` luôn có `fieldOverrides`:

```json
{
  "fieldOverrides": [
    {
      "collectionGroup": "rate_limit_windows",
      "fieldPath": "expireAt",
      "indexes": [],
      "ttlPolicy": { "state": "ACTIVE" }
    }
  ]
}
```

**Lưu ý:** Khi CLI hỏi "The following field overrides are not present in your config. Do you want to delete them?" — **trả lời No** trừ khi chủ động muốn xóa TTL/index đó.

---

## 5. Centralize Polling Timers — `hooks/usePolling.ts`

### Vấn đề trước

4 hooks quản lý `setInterval` + `visibilitychange` listener theo cùng pattern, copy-paste:

```
usePendingUsersNotifier   — 5m interval, no gap
useGlobalSettingsAndApiKey — 3m interval, 60s focus gap
useAuthAndProfile          — 90s interval, 45s focus gap
useUserSessions (heartbeat)— 5m interval, skip khi invisible
```

Mỗi hook tự track `lastFetchAt`, logic `minGap`, cleanup — dễ diverge và khó maintain.

### Giải pháp: `hooks/usePolling.ts`

```typescript
interface UsePollingOptions {
  enabled?: boolean;       // tắt/bật toàn bộ timer (default: true)
  minFocusGapMs?: number;  // min ms giữa 2 lần chạy khi focus lại tab (default: 0)
  runImmediately?: boolean;// chạy ngay khi mount (default: true)
  runOnFocus?: boolean;    // thêm visibilitychange listener (default: true)
}

export function usePolling(
  callback: () => void,
  intervalMs: number,
  options?: UsePollingOptions,
): void
```

**Thiết kế:**
- `cbRef` (useRef) giữ callback mới nhất — callback thay đổi không restart interval.
- `lastRanRef` track thời điểm chạy gần nhất — dùng cho `minFocusGapMs`.
- `enabled: false` → cleanup hoàn toàn (không set interval, không listener).
- `runOnFocus: false` → không thêm `visibilitychange` (dùng cho heartbeat).

### Kết quả refactor

| Hook | Trước | Sau |
|------|-------|-----|
| `usePendingUsersNotifier` | ~40 dòng boilerplate | `usePolling(check, 5min, { enabled: isAdmin })` |
| `useGlobalSettingsAndApiKey` | inline effect với `pollTimer` + `onVisibility` | `usePolling(refreshAll, 3min, { enabled: !!user, minFocusGapMs: 60s })` |
| `useAuthAndProfile` | `pollTimer` trong `onAuthStateChanged` callback | `usePolling(fetchUserProfile, 90s, { enabled: !!user, minFocusGapMs: 45s, runImmediately: false })` |
| `useUserSessions` | `heartbeatTimer` trong useEffect | `usePolling(heartbeatCallback, 5min, { enabled: !!uid && enabled, runOnFocus: false, runImmediately: false })` |

**`useUserSessions` — trường hợp đặc biệt:** Hook này có 2 logic visibility khác nhau:
1. Heartbeat `touchUserSession` (5m) → `usePolling` với `runOnFocus: false`
2. `registerOrTouchUserSession` khi tab visible lại (re-register session) → giữ `visibilitychange` listener riêng, không thay đổi

**`useAuthAndProfile` — tách auth state và polling:** `onAuthStateChanged` listener tách ra effect riêng (chỉ subscribe/unsubscribe auth). `usePolling` xử lý periodic refresh độc lập — không còn `pollTimer` ẩn trong closure của auth listener.

### Net change

- 5 files thay đổi, net **−35 lines** (226 thêm, 196 xóa)
- 1 file mới: `hooks/usePolling.ts`

---

## 6. Trạng thái sau Phase 2

| Kiểm tra | Kết quả |
|----------|---------|
| `npm run build` | ✅ 0 lỗi TypeScript |
| Health check `/_health` | ✅ `{"status":"ok"}` |
| Express 5 SPA catch-all | ✅ `/*path` |
| SIGTERM graceful shutdown | ✅ 8s timeout |
| Firestore TTL restored | ✅ `state: ACTIVE` |
| Polling centralized | ✅ 4 hooks refactored |

---

## Tài liệu liên quan

- `docs/02-frontend-architecture.md` — hooks table (thêm `usePolling.ts`)
- `docs/06-live-deployment.md` — smoke test `/_health`
- `docs/10-security-hardening-2026-06.md` — rate limit, SSRF, CSP

---

*Cập nhật: 19/06/2026*
