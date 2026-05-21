import { useState, useCallback } from 'react';
import { auth, db, doc, getDoc, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { describeApiOrNetworkError } from '../utils/userFacingError';
import {
  ALLOWED_GEMINI_MODEL_IDS,
  DEFAULT_ENABLED_PROVIDERS,
  normalizeEnabledProviders,
  normalizeGeminiModelId,
  type ProviderKey,
} from '../constants/aiModels';
import type { AdminSettingsSnapshot } from '../components/admin/types';

export function useAdminSettings() {
  const [seedanceBaseUrl, setSeedanceBaseUrl] = useState('');
  const [seedreamBaseUrl, setSeedreamBaseUrl] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-image-preview');
  const [seedanceModel, setSeedanceModel] = useState('seed-1.5-pro');
  const [seedreamModel, setSeedreamModel] = useState('seedream-4.0');
  const [enabledProviders, setEnabledProviders] = useState<ProviderKey[]>([
    ...DEFAULT_ENABLED_PROVIDERS,
  ]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [initialSettingsSnapshot, setInitialSettingsSnapshot] =
    useState<AdminSettingsSnapshot | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        const normalizedGeminiModel = normalizeGeminiModelId(data.geminiModel);
        const normalizedEnabledProviders = normalizeEnabledProviders(
          data.enabledProviders ??
            (data.defaultProvider ? [data.defaultProvider] : DEFAULT_ENABLED_PROVIDERS)
        );
        const normalized: AdminSettingsSnapshot = {
          seedanceBaseUrl: data.seedanceBaseUrl || '',
          seedreamBaseUrl: data.seedreamBaseUrl || '',
          geminiModel: normalizedGeminiModel,
          seedanceModel: data.seedanceModel || 'seed-1.5-pro',
          seedreamModel: data.seedreamModel || 'seedream-4.0',
          enabledProviders: normalizedEnabledProviders,
        };
        setSeedanceBaseUrl(normalized.seedanceBaseUrl);
        setSeedreamBaseUrl(normalized.seedreamBaseUrl);
        setGeminiModel(normalized.geminiModel);
        setSeedanceModel(normalized.seedanceModel);
        setSeedreamModel(normalized.seedreamModel);
        setEnabledProviders(normalized.enabledProviders);
        setInitialSettingsSnapshot(normalized);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Không tải được cấu hình hệ thống', {
        description: describeApiOrNetworkError(msg),
      });
    }
  }, []);

  const toggleEnabledProvider = (provider: ProviderKey) => {
    setEnabledProviders((prev) => {
      if (prev.includes(provider)) {
        return prev.filter((item) => item !== provider);
      }
      return [...prev, provider];
    });
  };

  const validateSettings = () => {
    const normalizedEnabledProviders = Array.from(
      new Set(
        enabledProviders.filter(
          (provider): provider is ProviderKey =>
            provider === 'gemini' ||
            provider === 'openai' ||
            provider === 'seedance' ||
            provider === 'seedream'
        )
      )
    );
    const trimmedSeedanceBaseUrl = seedanceBaseUrl.trim();
    const trimmedSeedreamBaseUrl = seedreamBaseUrl.trim();
    const trimmedSeedanceModel = seedanceModel.trim();
    const trimmedSeedreamModel = seedreamModel.trim();
    const normalizedGeminiModel = normalizeGeminiModelId(geminiModel);

    if (!ALLOWED_GEMINI_MODEL_IDS.has(normalizedGeminiModel)) {
      return { ok: false as const, message: 'Gemini model không hợp lệ.' };
    }

    if (normalizedEnabledProviders.length === 0) {
      return { ok: false as const, message: 'Cần bật ít nhất một provider.' };
    }

    if (normalizedEnabledProviders.includes('seedance') && !trimmedSeedanceModel) {
      return {
        ok: false as const,
        message: 'Seedance model không được để trống khi dùng Seedance.',
      };
    }
    if (normalizedEnabledProviders.includes('seedream') && !trimmedSeedreamModel) {
      return {
        ok: false as const,
        message: 'Seedream model không được để trống khi dùng Seedream.',
      };
    }

    if (trimmedSeedanceBaseUrl) {
      try {
        const parsed = new URL(trimmedSeedanceBaseUrl);
        if (parsed.protocol !== 'https:') {
          return { ok: false as const, message: 'Seedance base URL phải dùng https://' };
        }
      } catch {
        return { ok: false as const, message: 'Seedance base URL không đúng định dạng URL.' };
      }
    }
    if (trimmedSeedreamBaseUrl) {
      try {
        const parsed = new URL(trimmedSeedreamBaseUrl);
        if (parsed.protocol !== 'https:') {
          return { ok: false as const, message: 'Seedream base URL phải dùng https://' };
        }
      } catch {
        return { ok: false as const, message: 'Seedream base URL không đúng định dạng URL.' };
      }
    }

    const warnings: string[] = [];
    if (initialSettingsSnapshot) {
      const before = initialSettingsSnapshot.enabledProviders.join(', ');
      const after = normalizedEnabledProviders.join(', ');
      if (before !== after) {
        warnings.push(`Bạn đang đổi danh sách provider bật từ [${before}] sang [${after}].`);
      }
    }

    return {
      ok: true as const,
      normalized: {
        seedanceBaseUrl: trimmedSeedanceBaseUrl,
        seedreamBaseUrl: trimmedSeedreamBaseUrl,
        geminiModel: normalizedGeminiModel,
        seedanceModel: trimmedSeedanceModel || 'seed-1.5-pro',
        seedreamModel: trimmedSeedreamModel || 'seedream-4.0',
        enabledProviders: normalizedEnabledProviders,
      },
      warnings,
    };
  };

  const handleSaveSettings = async () => {
    const validation = validateSettings();
    if (!validation.ok) {
      toast.error('Cấu hình chưa hợp lệ', { description: validation.message });
      return;
    }
    if (validation.warnings.length > 0) {
      const shouldContinue = window.confirm(
        `Cảnh báo trước khi lưu:\n- ${validation.warnings.join('\n- ')}\n\nBạn vẫn muốn tiếp tục lưu?`
      );
      if (!shouldContinue) return;
    }

    setIsSavingSettings(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(
        settingsRef,
        { ...validation.normalized, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setInitialSettingsSnapshot(validation.normalized);
      toast.success('Đã lưu cấu hình hệ thống.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Chưa lưu được cấu hình', { description: describeApiOrNetworkError(msg) });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestProvider = async () => {
    const validation = validateSettings();
    if (!validation.ok) {
      toast.error('Không thể test provider', { description: validation.message });
      return;
    }

    if (!auth.currentUser) {
      toast.error('Phiên đăng nhập đã hết hạn', {
        description: 'Vui lòng đăng nhập lại để test provider.',
      });
      return;
    }

    setIsTestingProvider(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const failedProviders: string[] = [];
      const okProviders: string[] = [];

      for (const provider of validation.normalized.enabledProviders) {
        const response = await fetch('/api/provider-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            provider,
            seedanceBaseUrl: validation.normalized.seedanceBaseUrl,
            seedreamBaseUrl: validation.normalized.seedreamBaseUrl,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          const detail = payload?.error || `HTTP ${response.status}`;
          failedProviders.push(`${provider}: ${detail}`);
        } else {
          okProviders.push(provider);
        }
      }

      if (failedProviders.length > 0) {
        toast.error('Test provider thất bại', { description: failedProviders.join(' | ') });
        return;
      }

      toast.success('Test provider thành công', {
        description: `Đã kiểm tra: ${okProviders.join(', ')}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error('Test provider thất bại', { description: describeApiOrNetworkError(msg) });
    } finally {
      setIsTestingProvider(false);
    }
  };

  return {
    seedanceBaseUrl,
    setSeedanceBaseUrl,
    seedreamBaseUrl,
    setSeedreamBaseUrl,
    geminiModel,
    setGeminiModel,
    seedanceModel,
    setSeedanceModel,
    seedreamModel,
    setSeedreamModel,
    enabledProviders,
    toggleEnabledProvider,
    isSavingSettings,
    isTestingProvider,
    loadSettings,
    handleSaveSettings,
    handleTestProvider,
  };
}
