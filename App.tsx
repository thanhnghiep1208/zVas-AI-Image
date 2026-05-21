import React, { useState, useCallback, useEffect } from 'react';
import { AuthLoadingScreen } from './components/layout/AuthLoadingScreen';
import { LandingPage } from './components/landing/LandingPage';
import { RejectedAccessScreen } from './components/guards/RejectedAccessScreen';
import { AppAuthenticatedShell } from './components/AppAuthenticatedShell';
import { trackEvent } from './services/analyticsService';
import { ga4Login, ga4SelectItem } from './utils/gtagEvent';
import { useAuthAndProfile } from './hooks/useAuthAndProfile';
import { useGlobalSettingsAndApiKey } from './hooks/useGlobalSettingsAndApiKey';
import { parseModelKey } from './constants/aiModels';
import {
  loadPreferredModelKey,
  savePreferredModelKey,
} from './utils/generationModelPreference';

const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null);

  const onLoginSuccess = useCallback((uid: string) => {
    trackEvent('user_login', { user_id: uid });
    ga4Login('google');
  }, []);

  const onLoginError = useCallback((message: string) => {
    setError(message);
  }, []);

  const resetSessionState = useCallback(() => {
    setError(null);
    setSelectedModelKey(null);
  }, []);

  const { user, userProfile, isAuthLoading, handleLogin, handleLogout } = useAuthAndProfile({
    onSignedOut: resetSessionState,
    onLoginError,
    onLoginSuccess,
  });

  const handleLoginWithClear = useCallback(() => {
    setError(null);
    void handleLogin();
  }, [handleLogin]);

  useEffect(() => {
    const saved = loadPreferredModelKey();
    if (saved) setSelectedModelKey(saved);
  }, []);

  const {
    globalSettings,
    systemApiKey,
    isCheckingApiKey,
    handleSelectApiKey,
    availableModelOptions,
    getProviderKey,
    getEffectiveModel,
    getSelectedModelKey,
  } = useGlobalSettingsAndApiKey(user, selectedModelKey);

  const handleModelPreferenceChange = useCallback((newModelKey: string) => {
    const parsed = parseModelKey(newModelKey);
    if (!parsed) return;
    ga4SelectItem({
      item_id: newModelKey,
      item_name: `${parsed.provider}:${parsed.model}`,
      item_list_name: 'header_model',
    });
    setSelectedModelKey(newModelKey);
    savePreferredModelKey(newModelKey);
  }, []);

  if (isAuthLoading || isCheckingApiKey) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <LandingPage onLogin={handleLoginWithClear} loginError={error} />;
  }

  if (userProfile && userProfile.status === 'rejected' && userProfile.role !== 'admin') {
    return <RejectedAccessScreen onLogout={handleLogout} />;
  }

  return (
    <AppAuthenticatedShell
      user={user}
      userProfile={userProfile}
      error={error}
      setError={setError}
      globalSettings={globalSettings}
      systemApiKey={systemApiKey}
      availableModelOptions={availableModelOptions}
      getProviderKey={getProviderKey}
      getEffectiveModel={getEffectiveModel}
      getSelectedModelKey={getSelectedModelKey}
      onModelPreferenceChange={handleModelPreferenceChange}
      onSelectApiKey={handleSelectApiKey}
      onLogout={handleLogout}
    />
  );
};

export default App;
