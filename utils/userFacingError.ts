/** Thông báo mặc định khi không khớp mẫu lỗi cụ thể — dùng chung UI + so sánh trong ErrorBoundary. */
export const USER_ERROR_GENERIC = 'Đã có lỗi xảy ra. Vui lòng thử lại hoặc tải lại trang.';

const USER_ERROR_UNEXPECTED = 'Đã xảy ra lỗi không mong đợi. Hãy tải lại trang để tiếp tục.';

/**
 * Chuyển lỗi kỹ thuật (API, Firestore, mạng) thành thông báo tiếng Việt ngắn gọn cho người dùng.
 * Không hiển thị stack, JSON thô hay mã nội bộ.
 */
export function describeApiOrNetworkError(raw: string): string {
  const n = (raw || '').toLowerCase();

  if (n.includes('client is offline') || n.includes('failed to get document because the client is offline')) {
    return 'Bạn đang ngoại tuyến hoặc mạng không ổn định. Kiểm tra kết nối rồi thử lại.';
  }
  if (
    n.includes('failed to fetch') ||
    n.includes('networkerror') ||
    n.includes('network request failed') ||
    n.includes('load failed')
  ) {
    return 'Không kết nối được máy chủ. Kiểm tra Internet và thử lại.';
  }
  if (
    n.includes('permission_denied') ||
    n.includes('missing or insufficient permissions') ||
    n.includes('permission denied') ||
    n.includes('403') ||
    n.includes('unregistered callers') ||
    n.includes('api_key_invalid') ||
    n.includes('identity')
  ) {
    return 'Chưa có quyền thực hiện thao tác này hoặc API key chưa hợp lệ. Kiểm tra đăng nhập và cấu hình key.';
  }
  if (n.includes('timeout') || n.includes('deadline exceeded') || n.includes('timed out') || n.includes('deadline-exceeded')) {
    return 'Dịch vụ phản hồi quá lâu. Đợi vài phút rồi thử lại.';
  }
  if (n.includes('quota exceeded')) {
    return 'Đã vượt hạn mức dịch vụ tạm thời. Thử lại sau.';
  }
  if (n.includes('rate limit') || n.includes('too many requests') || n.includes('resource-exhausted')) {
    return 'Bạn thao tác quá nhanh hoặc đã đạt giới hạn tạm thời. Chờ một chút rồi thử lại.';
  }
  if (n.includes('quota') && (n.includes('limit') || n.includes('exhausted'))) {
    return 'Đã đạt giới hạn sử dụng tạm thời. Thử lại sau.';
  }
  if (
    n.includes('filter') ||
    n.includes('safety') ||
    (n.includes('blocked') && !n.includes('popup'))
  ) {
    return 'Nội dung bị chặn bởi bộ lọc an toàn. Hãy chỉnh lại mô tả hoặc ảnh tham chiếu.';
  }
  if (n.includes('invalid argument') || n.includes('bad request') || n.includes(' 400')) {
    return 'Dữ liệu gửi đi chưa hợp lệ. Kiểm tra prompt và tùy chọn rồi thử lại.';
  }
  if (n.includes(' 500') || n.includes('internal error')) {
    return 'Máy chủ gặp sự cố tạm thời. Vui lòng thử lại sau.';
  }
  if (n.includes('401') || n.includes('unauthenticated')) {
    return 'Phiên đăng nhập hết hạn hoặc chưa xác thực. Hãy đăng nhập lại.';
  }
  if (n.includes('invalid') && n.includes('prompt')) {
    return 'Prompt chưa hợp lệ. Kiểm tra và thử lại.';
  }

  return USER_ERROR_GENERIC;
}

/**
 * Dùng trong UI (CreateView, v.v.) để chọn tone cảnh báo (ví dụ amber) thay vì lỗi đỏ:
 * quota Firestore/API, bản dịch tiếng Việt từ {@link describeApiOrNetworkError}, hoặc giới hạn tạm thời.
 */
export function isQuotaOrUsageLimitUserMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const n = message.toLowerCase();
  return (
    n.includes('quota exceeded') ||
    n.includes('resource-exhausted') ||
    n.includes('hạn mức') ||
    (n.includes('giới hạn') &&
      (n.includes('dịch vụ') || n.includes('sử dụng') || n.includes('tạm thời') || n.includes('thao tác')))
  );
}

/** Lỗi đăng nhập Google (mã Firebase Auth) → thông báo thân thiện. */
export function describeAuthSignInError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  if (code === 'auth/requests-from-referer-blocked') {
    return (
      `Trang web chưa được thêm vào Firebase. Nhờ quản trị thêm tên miền «${host}» vào mục Authorized domains trong Firebase Console.`
    );
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Cửa sổ đăng nhập đã đóng. Nhấn Đăng nhập để thử lại.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Trình duyệt đã chặn cửa sổ đăng nhập. Cho phép popup cho trang này rồi thử lại.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Không kết nối được Google. Kiểm tra mạng và thử lại.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Đăng nhập thử quá nhiều lần. Đợi vài phút rồi thử lại.';
  }
  if (code === 'auth/user-disabled') {
    return 'Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị.';
  }

  return 'Đăng nhập không thành công. Thử lại sau ít phút.';
}

/**
 * Thông báo cho ErrorBoundary: hỗ trợ payload JSON từ log Firestore cũ / lỗi có cấu trúc,
 * không hiển thị operationType/path thô cho người dùng.
 */
export function describeErrorBoundaryUserMessage(error: Error | null): string {
  if (!error?.message) return USER_ERROR_UNEXPECTED;

  try {
    const parsed = JSON.parse(error.message) as { error?: string; path?: string | null };
    if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
      const fromApi = describeApiOrNetworkError(parsed.error);
      const path = (parsed.path || '').toLowerCase();
      if (fromApi === USER_ERROR_GENERIC) {
        if (path.includes('settings/global')) {
          return 'Không tải được cấu hình hệ thống. Kiểm tra mạng rồi tải lại trang.';
        }
        if (path.startsWith('users/')) {
          return 'Không tải được hồ sơ người dùng. Thử tải lại trang hoặc đăng nhập lại.';
        }
      }
      return fromApi;
    }
  } catch {
    /* không phải JSON */
  }

  const mapped = describeApiOrNetworkError(error.message);
  if (mapped !== USER_ERROR_GENERIC) return mapped;
  if (error.message.length > 160) return USER_ERROR_UNEXPECTED;
  return error.message;
}
