import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { db, doc, getDoc, handleFirestoreError, isFirestoreOfflineOrTransient, OperationType } from '../firebase';
import {
  DEFAULT_ENABLED_PROVIDERS,
  getEnabledModelOptions,
  modelKeyFrom,
  normalizeEnabledProviders,
  resolveModelKey,
  type ProviderKey,
  type ProviderModelOption,
} from '../constants/aiModels';
import { getRuntimeEnvValue, isLikelyPlaceholderKey } from '../utils/runtimeEnv';

/** Không dùng onSnapshot — refetch theo chu kỳ + khi quay lại tab. */
const SETTINGS_POLL_INTERVAL_MS = 3 * 60 * 1000;
const SETTINGS_FOCUS_MIN_GAP_MS = 60 * 1000;

export interface UseGlobalSettingsAndApiKeyResult {
  globalSettings: any;
  systemApiKey: string | null;
  hasApiKey: boolean;
  isCheckingApiKey: boolean;
  enabledProviders: ProviderKey[];
  availableModelOptions: ProviderModelOption[];
  handleSelectApiKey: () => Promise<void>;
  getProviderKey: () => ProviderKey;
  getEffectiveModel: () => string;
  getSelectedModelKey: () => string;
}

export function useGlobalSettingsAndApiKey(
  user: User | null,
  selectedModelKey: string | null
): UseGlobalSettingsAndApiKeyResult {
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [systemApiKey, setSystemApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

  useEffect(() => {
    const loadConfigAndCheckKey = async () => {
      try {
        const cachedSettings = sessionStorage.getItem('global_settings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setGlobalSettings(parsed);
        }

        const w = window as Window & {
          aistudio?: { hasSelectedApiKey?: () => Promise<boolean> };
        };
        if (w.aistudio?.hasSelectedApiKey) {
          const hasKey = await w.aistudio.hasSelectedApiKey();
          if (hasKey) {
            setHasApiKey(true);
            setIsCheckingApiKey(false);
            return;
          }
        }

        const hasEnvKey =
          !isLikelyPlaceholderKey(getRuntimeEnvValue('API_KEY')) ||
          !isLikelyPlaceholderKey(getRuntimeEnvValue('GEMINI_API_KEY'));
        if (hasEnvKey) {
          setHasApiKey(true);
        }
      } catch (err) {
        console.error('Error checking API key sources:', err);
      } finally {
        setIsCheckingApiKey(false);
      }
    };
    loadConfigAndCheckKey();
  }, []);

  const enabledProviders = normalizeEnabledProviders(globalSettings?.enabledProviders);
  const availableModelOptions = getEnabledModelOptions(enabledProviders);

  const getSelectedModelOption = useCallback(() => {
    return resolveModelKey(enabledProviders, selectedModelKey);
  }, [enabledProviders, selectedModelKey]);

  useEffect(() => {
    if (!user) {
      setGlobalSettings(null);
      return undefined;
    }

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let lastFetchAt = 0;

    const fetchSettings = async () => {
      const settingsRef = doc(db, 'settings', 'global');
      try {
        const docSnap = await getDoc(settingsRef);
        lastFetchAt = Date.now();
        if (docSnap.exists()) {
          const settingsData = docSnap.data();
          setGlobalSettings(settingsData);
          sessionStorage.setItem('global_settings', JSON.stringify(settingsData));
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const useCache =
          msg.includes('Quota exceeded') || isFirestoreOfflineOrTransient(error);
        if (useCache) {
          if (isFirestoreOfflineOrTransient(error)) {
            console.warn('Settings: Firestore unavailable (offline/transient), using cache if any.');
          } else {
            console.warn('Settings quota exceeded, using cache.');
          }
          const cached = sessionStorage.getItem('global_settings');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setGlobalSettings(parsed);
            } catch {
              /* ignore */
            }
          }
        } else {
          handleFirestoreError(error, OperationType.GET, 'settings/global');
        }
      }
    };

    void fetchSettings();
    pollTimer = setInterval(() => void fetchSettings(), SETTINGS_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchAt < SETTINGS_FOCUS_MIN_GAP_MS) return;
      void fetchSettings();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  const handleSelectApiKey = useCallback(async () => {
    try {
      const w = window as Window & {
        aistudio?: { openSelectKey?: () => Promise<void> };
      };
      if (w.aistudio?.openSelectKey) {
        await w.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    } catch (err) {
      console.error('Error opening API key selection:', err);
    }
  }, []);

  const getProviderKey = useCallback(
    () => getSelectedModelOption().provider,
    [getSelectedModelOption]
  );

  const getEffectiveModel = useCallback(() => {
    return getSelectedModelOption().value;
  }, [getSelectedModelOption]);

  const getSelectedModelKey = useCallback(() => {
    const option = getSelectedModelOption();
    return modelKeyFrom(option.provider, option.value);
  }, [getSelectedModelOption]);

  return {
    globalSettings,
    systemApiKey,
    hasApiKey,
    isCheckingApiKey,
    enabledProviders:
      enabledProviders.length > 0 ? enabledProviders : [...DEFAULT_ENABLED_PROVIDERS],
    availableModelOptions,
    handleSelectApiKey,
    getProviderKey,
    getEffectiveModel,
    getSelectedModelKey,
  };
}
