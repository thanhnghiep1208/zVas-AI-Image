import type { ProviderKey } from '../../constants/aiModels';

export type AdminTab = 'users' | 'settings' | 'analytics';

export interface AdminUserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'editor' | 'advice';
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdminSettingsSnapshot {
  seedanceBaseUrl: string;
  seedreamBaseUrl: string;
  geminiModel: string;
  seedanceModel: string;
  seedreamModel: string;
  enabledProviders: ProviderKey[];
}

export interface AdminDashboardProps {
  onClose: () => void;
  initialTab?: AdminTab;
  /** Role `advice`: chỉ hiển thị Analytics, không tải danh sách user / cấu hình */
  analyticsOnly?: boolean;
}
