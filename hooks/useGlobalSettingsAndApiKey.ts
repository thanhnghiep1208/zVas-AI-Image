import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { db, doc, getDoc, handleFirestoreError, OperationType } from '../firebase';
import { getRuntimeEnvValue, isLikelyPlaceholderKey } from '../utils/runtimeEnv';

/** Không dùng onSnapshot — refetch theo chu kỳ + khi quay lại tab. */
const SETTINGS_POLL_INTERVAL_MS = 3 * 60 * 1000;
const SETTINGS_FOCUS_MIN_GAP_MS = 60 * 1000;

export interface UseGlobalSettingsAndApiKeyResult {
  globalSettings: any;
  systemApiKey: string | null;
  hasApiKey: boolean;
  isCheckingApiKey: boolean;
  handleSelectApiKey: () => Promise<void>;
  getProviderKey: () => string;
  getEffectiveModel: () => string;
}

export function useGlobalSettingsAndApiKey(
  user: User | null,
  userModelPreference: Record<string, string>
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
          setSystemApiKey(parsed.systemApiKey || null);
          setHasApiKey(!!parsed.systemApiKey);
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
          setSystemApiKey(settingsData.systemApiKey || null);
          sessionStorage.setItem('global_settings', JSON.stringify(settingsData));
          if (settingsData.systemApiKey) {
            setHasApiKey(true);
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Quota exceeded')) {
          console.warn('Settings quota exceeded, using cache.');
          const cached = sessionStorage.getItem('global_settings');
          if (cached) {
            try {
              setGlobalSettings(JSON.parse(cached));
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
    () => globalSettings?.defaultProvider || 'gemini',
    [globalSettings]
  );

  const getEffectiveModel = useCallback(() => {
    const providerKey = getProviderKey();
    const fallbackByProvider: Record<string, string> = {
      gemini: globalSettings?.geminiModel || 'gemini-3.1-flash-image-preview',
      openai: 'dall-e-3',
      seedance: globalSettings?.seedanceModel || 'seed-1.5-pro',
    };
    return (
      userModelPreference[providerKey] ||
      fallbackByProvider[providerKey] ||
      fallbackByProvider.gemini
    );
  }, [getProviderKey, globalSettings, userModelPreference]);

  return {
    globalSettings,
    systemApiKey,
    hasApiKey,
    isCheckingApiKey,
    handleSelectApiKey,
    getProviderKey,
    getEffectiveModel,
  };
}
