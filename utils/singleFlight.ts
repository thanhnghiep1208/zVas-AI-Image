/**
 * Chặn chạy chồng một tác vụ async (vd. nút "Tạo ảnh").
 *
 * `disabled={isLoading}` chỉ có hiệu lực sau khi React render lại, nên click
 * kép nhanh vẫn gọi handler 2 lần. Dữ liệu 10/2026: mỗi lỗi Safari "Load failed"
 * sau ~80ms đều đi kèm 2 sự kiện `image_generation_started` cách nhau 50–100ms —
 * request đầu bị hủy, request sau thành công.
 */
export function createSingleFlightGuard() {
  let inFlight = false;
  return {
    tryAcquire(): boolean {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    release(): void {
      inFlight = false;
    },
    isInFlight(): boolean {
      return inFlight;
    },
  };
}
