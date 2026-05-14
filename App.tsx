import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import type { ImageFile, GeneratedImage, ImageSize } from './types';
import { AuthLoadingScreen } from './components/layout/AuthLoadingScreen';
import { LandingPage } from './components/landing/LandingPage';
import { RejectedAccessScreen } from './components/guards/RejectedAccessScreen';
import { AppHeaderWithPending } from './components/layout/AppHeaderWithPending';
import type { AppView } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { trackEvent } from './services/analyticsService';
import { Toaster, toast } from 'sonner';
import { dataURLtoFile } from './utils/imageDataUrl';
import { getClosestAspectRatio } from './utils/aspectRatio';
import { useGeneratedImageDownload } from './hooks/useGeneratedImageDownload';
import { useAuthAndProfile } from './hooks/useAuthAndProfile';
import { useGlobalSettingsAndApiKey } from './hooks/useGlobalSettingsAndApiKey';
import { useHistoryImages } from './hooks/useHistoryImages';
import { useImageGeneration } from './hooks/useImageGeneration';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const preloadAdminDashboard = () =>
  import('./components/AdminDashboard');

const CreateView = lazy(() =>
  import('./components/views/CreateView').then((m) => ({ default: m.CreateView }))
);
const MultipleImage = lazy(() =>
  import('./components/MultipleImage').then((m) => ({ default: m.MultipleImage }))
);
const MergeImage = lazy(() =>
  import('./components/MergeImage').then((m) => ({ default: m.MergeImage }))
);
const StyleGuideViewer = lazy(() =>
  import('./components/StyleGuideViewer').then((m) => ({ default: m.StyleGuideViewer }))
);
const FullscreenViewer = lazy(() =>
  import('./components/FullscreenViewer').then((m) => ({ default: m.FullscreenViewer }))
);

const WorkspaceViewFallback = () => (
  <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 text-[var(--lp-muted)]">
    <div
      className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--lp-accent-dim)] border-t-[var(--lp-accent)]"
      aria-hidden
    />
    <p className="text-sm">Đang tải giao diện…</p>
  </div>
);

const ModalLoadingOverlay = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lp-void)]/75 backdrop-blur-[2px]">
    <div
      className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--lp-accent-dim)] border-t-[var(--lp-accent)]"
      aria-hidden
    />
  </div>
);

const AdminDashboardFallback = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[var(--lp-void)]/95 backdrop-blur-md">
    <div
      className="h-11 w-11 animate-spin rounded-full border-2 border-[var(--lp-accent-dim)] border-t-[var(--lp-accent)]"
      aria-hidden
    />
    <p className="text-sm text-[var(--lp-muted)]">Đang tải bảng điều khiển…</p>
  </div>
);

const App: React.FC = () => {
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'analytics' | 'users' | 'settings'>('users');
  const [image, setImage] = useState<ImageFile | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageFile[]>([]);
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null);
  const [isStyleGuideVisible, setIsStyleGuideVisible] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [currentView, setCurrentView] = useState<AppView>('create');
  
  const [outlineType, setOutlineType] = useState<'none' | 'white' | 'black'>('none');
  const [outlineThickness, setOutlineThickness] = useState<'thin' | 'normal' | 'thick'>('normal');

  const [promptOptions, setPromptOptions] = useState({
    styleSimplified: false,
    keepStyle: false,
    keepStartImageStyle: false,
    forceRemoveBackground: false,
    backgroundRemovalStrength: 'soft' as 'soft' | 'strong',
  });
  const [backgroundStyle, setBackgroundStyle] = useState('none'); 
  const [userModelPreference, setUserModelPreference] = useState<Record<string, string>>({});
  const [workspaceMountKey, setWorkspaceMountKey] = useState(0);

  const openAdminDashboard = useCallback(() => {
    setIsAdminDashboardOpen(true);
  }, []);

  const resetAppState = useCallback((opts?: { preserveView?: boolean }) => {
    setImage(null);
    setReferenceImages([]);
    setPrompts(['']);
    setError(null);
    setFullscreenImage(null);
    setIsStyleGuideVisible(false);
    setAspectRatio('1:1');
    setImageSize('1K');
    setSelectedStyle('');
    setOutlineType('none');
    setOutlineThickness('normal');
    setPromptOptions({
      styleSimplified: false,
      keepStyle: false,
      keepStartImageStyle: false,
      forceRemoveBackground: false,
      backgroundRemovalStrength: 'soft',
    });
    setBackgroundStyle('none');
    setIsAdminDashboardOpen(false);
    if (!opts?.preserveView) {
      setCurrentView('create');
    }
  }, []);

  const onLoginSuccess = useCallback((uid: string) => {
    trackEvent('user_login', { user_id: uid });
  }, []);

  const onLoginError = useCallback((message: string) => {
    setError(message);
  }, []);

  const { user, userProfile, isAuthLoading, handleLogin, handleLogout } = useAuthAndProfile({
    onSignedOut: resetAppState,
    onLoginError,
    onLoginSuccess,
  });

  const handleLoginWithClear = useCallback(() => {
    setError(null);
    void handleLogin();
  }, [handleLogin]);

  const { historyImages, setHistoryImages, handleClearHistory } = useHistoryImages(user);

  // Check for API Key selection (required for gemini-3.1-flash-image-preview)
  useEffect(() => {
    const savedPreference = localStorage.getItem('preferred_generation_models');
    if (savedPreference) {
      try {
        setUserModelPreference(JSON.parse(savedPreference));
      } catch (error) {
        console.warn('Invalid model preference in localStorage');
      }
    }
  }, []);

  const {
    globalSettings,
    systemApiKey,
    isCheckingApiKey,
    handleSelectApiKey,
    getProviderKey,
    getEffectiveModel,
  } = useGlobalSettingsAndApiKey(user, userModelPreference);

  const handleModelPreferenceChange = useCallback((newModel: string) => {
    const providerKey = getProviderKey();
    setUserModelPreference((prev) => {
      const next = { ...prev, [providerKey]: newModel };
      localStorage.setItem('preferred_generation_models', JSON.stringify(next));
      return next;
    });
  }, [getProviderKey]);

  const handleOpenAdminSettings = useCallback(() => {
    setAdminInitialTab('settings');
    setIsAdminDashboardOpen(true);
  }, []);

  const handleOpenAdminUsers = useCallback(() => {
    setAdminInitialTab('users');
    setIsAdminDashboardOpen(true);
  }, []);

  const handleOpenAdminAnalytics = useCallback(() => {
    setAdminInitialTab('analytics');
    setIsAdminDashboardOpen(true);
  }, []);

  const handlePrefetchAdminDashboard = useCallback(() => {
    void preloadAdminDashboard();
  }, []);

  const handleCloseAdminDashboard = useCallback(() => {
    setIsAdminDashboardOpen(false);
  }, []);

  const handleShowStyleGuide = useCallback(() => {
    setIsStyleGuideVisible(true);
  }, []);

  const handleCloseStyleGuide = useCallback(() => {
    setIsStyleGuideVisible(false);
  }, []);

  const {
    isLoading,
    generatedImages,
    setGeneratedImages,
    handleGenerateClick,
    resetGenerationWorkspace,
  } = useImageGeneration({
    user,
    prompts,
    image,
    referenceImages,
    aspectRatio,
    imageSize,
    selectedStyle,
    backgroundStyle,
    outlineType,
    outlineThickness,
    promptOptions,
    globalSettings,
    systemApiKey,
    getEffectiveModel,
    currentView,
    setHistoryImages,
    setError,
  });

  const handleLogoWorkspaceRefresh = useCallback(() => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    referenceImages.forEach((ref) => URL.revokeObjectURL(ref.previewUrl));
    resetGenerationWorkspace();
    resetAppState({ preserveView: true });
    setWorkspaceMountKey((k) => k + 1);
  }, [image, referenceImages, resetAppState, resetGenerationWorkspace]);

  const handleOptionChange = useCallback((option: keyof typeof promptOptions) => {
    setPromptOptions((prevOptions) => ({
      ...prevOptions,
      [option]: !prevOptions[option],
    }));
  }, []);

  const handleBackgroundRemovalStrengthChange = useCallback((strength: 'soft' | 'strong') => {
    setPromptOptions((prev) => ({ ...prev, backgroundRemovalStrength: strength }));
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl };
    });

    const img = new Image();
    img.onload = () => {
      const closest = getClosestAspectRatio(img.naturalWidth, img.naturalHeight);
      setAspectRatio(closest);
    };
    img.src = previewUrl;

    setGeneratedImages([]);
    setError(null);
  }, [setGeneratedImages]);
  
  const handleImageRemove = useCallback(() => {
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      setImage(null);
    }
    referenceImages.forEach(refImg => URL.revokeObjectURL(refImg.previewUrl));
    setReferenceImages([]);
    setGeneratedImages([]);
    setError(null);
  }, [image, referenceImages, setGeneratedImages]);

  const handleAddReferenceImage = useCallback((file: File) => {
    setReferenceImages(prev => [...prev, {
      file,
      previewUrl: URL.createObjectURL(file),
    }]);
  }, []);

  const handleRemoveReferenceImage = useCallback((indexToRemove: number) => {
    setReferenceImages(prev => {
        const imageToRemove = prev[indexToRemove];
        if (imageToRemove) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
        }
        return prev.filter((_, index) => index !== indexToRemove);
    });
  }, []);

  const handleStyleSelectFromGuide = useCallback((styleValue: string) => {
    setSelectedStyle(styleValue);
    setIsStyleGuideVisible(false);
  }, []);
  
  const handleUseImageAsInput = useCallback(async (generatedImage: GeneratedImage) => {
    const newFileName = `generated_${generatedImage.prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 20)}.png`;
    const file = dataURLtoFile(generatedImage.imageUrl, newFileName);

    if (!file) {
      setError('Không dùng được ảnh này làm đầu vào. Thử tải lại hoặc chọn ảnh khác.');
      return;
    }
    
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
    }
    referenceImages.forEach(refImg => URL.revokeObjectURL(refImg.previewUrl));

    setImage({
      file,
      previewUrl: URL.createObjectURL(file),
    });

    setGeneratedImages([]);
    setReferenceImages([]);
    setError(null);
  }, [image, referenceImages, setGeneratedImages]);

  const onDownloadTracked = useCallback((meta: { exportType: 'jpg' | 'png'; removeBackground: boolean }) => {
    if (user) {
      trackEvent('image_downloaded', {
        user_id: user.uid,
        generation_type: currentView,
        image_count: 1,
        export_type: meta.exportType,
        remove_background: meta.removeBackground,
      });
    }
  }, [user, currentView]);

  const { handleDownloadImage, handleForceRemoveBackgroundDownload } = useGeneratedImageDownload({
    backgroundStyle,
    promptOptions: {
      forceRemoveBackground: promptOptions.forceRemoveBackground,
      backgroundRemovalStrength: promptOptions.backgroundRemovalStrength,
    },
    onDownloadTracked,
  });

  const handleUseImageFromViewer = useCallback(async (generatedImage: GeneratedImage) => {
    await handleUseImageAsInput(generatedImage);
    setFullscreenImage(null);
  }, [handleUseImageAsInput]);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  const handleFullscreenDownload = useCallback(() => {
    if (fullscreenImage) {
      void handleDownloadImage(fullscreenImage);
    }
  }, [fullscreenImage, handleDownloadImage]);

  const handleFullscreenForceRemoveBackgroundDownload = useCallback(() => {
    if (fullscreenImage) {
      void handleForceRemoveBackgroundDownload(fullscreenImage);
    }
  }, [fullscreenImage, handleForceRemoveBackgroundDownload]);

  const handleFullscreenUseAsInput = useCallback(() => {
    if (fullscreenImage) {
      void handleUseImageFromViewer(fullscreenImage);
    }
  }, [fullscreenImage, handleUseImageFromViewer]);

  const canGenerate = prompts.some(p => p.trim() !== '') && !isLoading;

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
    <>
      <Toaster position="top-right" richColors />
      <div className="app-shell relative flex h-screen flex-col overflow-hidden bg-[var(--lp-void)] font-sans text-[var(--lp-text)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_-20%,var(--lp-glow-teal),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_100%_100%,var(--lp-glow-blue),transparent_50%)]"
          aria-hidden
        />
        <div className="lp-grain pointer-events-none absolute inset-0 opacity-[0.32] mix-blend-overlay" aria-hidden />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <AppHeaderWithPending
          user={user}
          userProfile={userProfile}
          currentView={currentView}
          onViewChange={setCurrentView}
          onSelectApiKey={handleSelectApiKey}
          onPendingToastOpen={openAdminDashboard}
          onOpenAdminSettings={handleOpenAdminSettings}
          onOpenAdminUsers={handleOpenAdminUsers}
          onOpenAdminAnalytics={handleOpenAdminAnalytics}
          onPrefetchAdminDashboard={handlePrefetchAdminDashboard}
          getEffectiveModel={getEffectiveModel}
          getProviderKey={getProviderKey}
          onModelPreferenceChange={handleModelPreferenceChange}
          onLogout={handleLogout}
          onLogoWorkspaceRefresh={handleLogoWorkspaceRefresh}
        />

        <div
          key={workspaceMountKey}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
        >
          <Suspense fallback={<WorkspaceViewFallback />}>
          {currentView === 'create' ? (
            <CreateView
              prompts={prompts}
              setPrompts={setPrompts}
              promptOptions={promptOptions}
              onOptionChange={handleOptionChange}
              onBackgroundRemovalStrengthChange={handleBackgroundRemovalStrengthChange}
              backgroundStyle={backgroundStyle}
              onBackgroundStyleChange={setBackgroundStyle}
              selectedStyle={selectedStyle}
              onSelectedStyleChange={setSelectedStyle}
              outlineType={outlineType}
              onOutlineTypeChange={setOutlineType}
              outlineThickness={outlineThickness}
              onOutlineThicknessChange={setOutlineThickness}
              image={image}
              referenceImages={referenceImages}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              onAddReferenceImage={handleAddReferenceImage}
              onRemoveReferenceImage={handleRemoveReferenceImage}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              imageSize={imageSize}
              onImageSizeChange={setImageSize}
              onShowStyleGuide={handleShowStyleGuide}
              onGenerate={handleGenerateClick}
              canGenerate={canGenerate}
              isLoading={isLoading}
              error={error}
              generatedImages={generatedImages}
              historyImages={historyImages}
              onFullscreen={setFullscreenImage}
              onUseAsInput={handleUseImageAsInput}
              onDownload={handleDownloadImage}
              onForceRemoveBackgroundDownload={handleForceRemoveBackgroundDownload}
              onClearHistory={handleClearHistory}
            />
          ) : currentView === 'multiple' ? (
            <MultipleImage 
              image={image}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              prompts={prompts}
              setPrompts={setPrompts}
              onGenerate={handleGenerateClick}
              isLoading={isLoading}
              error={error}
              generatedImages={generatedImages}
              historyImages={historyImages}
              onFullscreen={setFullscreenImage}
              onUseAsInput={handleUseImageAsInput}
              onDownload={handleDownloadImage}
              onForceRemoveBackgroundDownload={handleForceRemoveBackgroundDownload}
              onClearHistory={handleClearHistory}
            />
          ) : (
            <main className="flex min-h-0 flex-shrink-0 flex-col lg:flex-1 lg:overflow-hidden">
              <MergeImage 
                onDownload={handleDownloadImage}
                onFullscreen={setFullscreenImage}
              />
            </main>
          )}
          </Suspense>
        </div>

        <AppFooter
          activeModelLabel={getEffectiveModel()}
          providerLabel={globalSettings?.defaultProvider || 'Gemini'}
        />
        </div>
      </div>

      {isStyleGuideVisible && (
        <Suspense fallback={<ModalLoadingOverlay />}>
          <StyleGuideViewer
            onClose={handleCloseStyleGuide}
            onStyleSelect={handleStyleSelectFromGuide}
          />
        </Suspense>
      )}
      {fullscreenImage && (
        <Suspense fallback={<ModalLoadingOverlay />}>
          <FullscreenViewer 
            image={fullscreenImage} 
            onClose={handleCloseFullscreen}
            onDownload={handleFullscreenDownload}
            onForceRemoveBackgroundDownload={handleFullscreenForceRemoveBackgroundDownload}
            onUseAsInput={handleFullscreenUseAsInput}
          />
        </Suspense>
      )}
      {isAdminDashboardOpen && (
        <Suspense fallback={<AdminDashboardFallback />}>
          <AdminDashboard
            onClose={handleCloseAdminDashboard}
            initialTab={userProfile?.role === 'advice' ? 'analytics' : adminInitialTab}
            analyticsOnly={userProfile?.role === 'advice'}
          />
        </Suspense>
      )}
    </>
  );
};

export default App;
