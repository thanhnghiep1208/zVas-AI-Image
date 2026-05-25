import React, { useState, useCallback, useEffect } from 'react';
import { AuthLoadingScreen } from './components/layout/AuthLoadingScreen';
import { LandingPage } from './components/landing/LandingPage';
import { LoginModal } from './components/landing/LoginModal';
import { RejectedAccessScreen } from './components/guards/RejectedAccessScreen';
import { PendingAccessScreen } from './components/guards/PendingAccessScreen';
import { AccountGateScreen } from './components/guards/AccountGateScreen';
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const onLoginSuccess = useCallback((uid: string) => {
    trackEvent('user_login', { user_id: uid });
    ga4Login('email');
  }, []);

  const onLoginError = useCallback((message: string) => {
    setError(message);
  }, []);

  const resetSessionState = useCallback(() => {
    setError(null);
    setSelectedModelKey(null);
  }, []);

  const {
    user,
    userProfile,
    isAuthLoading,
    profileGate,
    profileGateMessage,
    waitForProfileGate,
    handleLogin,
    handleLogout,
  } = useAuthAndProfile({
    onSignedOut: resetSessionState,
    onLoginError,
    onLoginSuccess,
  });

  const handleSubmitLogin = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoggingIn(true);
    try {
      const ok = await handleLogin(email, password);
      if (!ok) return;

      const { gate, message } = await waitForProfileGate(15_000);
      if (gate === 'ready') {
        setIsLoginModalOpen(false);
        return;
      }
      setError(
        message ?? 'Không tải được hồ sơ tài khoản sau khi đăng nhập.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  }, [handleLogin, waitForProfileGate]);

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
    isProviderKeyConfigured,
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
    return (
      <>
        <LandingPage
          onLoginClick={() => setIsLoginModalOpen(true)}
          sessionNotice={!isLoginModalOpen ? error : null}
        />
        <LoginModal
          open={isLoginModalOpen}
          onClose={() => { setError(null); setIsLoginModalOpen(false); }}
          onLogin={handleSubmitLogin}
          loginError={error}
          isLoggingIn={isLoggingIn}
        />
      </>
    );
  }

  if (profileGate === 'loading' || (user && profileGate === 'idle')) {
    return <AuthLoadingScreen />;
  }

  if (user && profileGate === 'missing') {
    return (
      <AccountGateScreen
        title="Tài khoản chưa được cấu hình"
        message={
          profileGateMessage ??
          'Đăng nhập thành công nhưng không có hồ sơ người dùng trên Firestore.'
        }
        detail="Quản trị cần tạo user trong Admin (hoặc document users/{uid}) với status approved."
        onLogout={handleLogout}
      />
    );
  }

  if (user && profileGate === 'error') {
    return (
      <AccountGateScreen
        title="Không tải được hồ sơ"
        message={profileGateMessage ?? 'Không đọc được document users/{uid}.'}
        onLogout={handleLogout}
      />
    );
  }

  if (!userProfile) {
    return <AuthLoadingScreen />;
  }

  if (
    userProfile &&
    userProfile.status === 'pending' &&
    userProfile.role !== 'admin'
  ) {
    return <PendingAccessScreen onLogout={handleLogout} />;
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
      isProviderKeyConfigured={isProviderKeyConfigured}
      onModelPreferenceChange={handleModelPreferenceChange}
      onSelectApiKey={handleSelectApiKey}
      onLogout={handleLogout}
    />
  );
};

export default App;
