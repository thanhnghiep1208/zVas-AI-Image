import React, { useState, useCallback, useEffect } from 'react';
import type { ImageFile, GeneratedImage, ImageSize } from './types';
import { FullscreenViewer } from './components/FullscreenViewer';
import { MergeImage } from './components/MergeImage';
import { MultipleImage } from './components/MultipleImage';
import { StyleGuideViewer } from './components/StyleGuideViewer';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthLoadingScreen } from './components/layout/AuthLoadingScreen';
import { LandingPage } from './components/landing/LandingPage';
import { RejectedAccessScreen } from './components/guards/RejectedAccessScreen';
import { AppHeader } from './components/layout/AppHeader';
import type { AppView } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { CreateView } from './components/views/CreateView';
import { trackEvent } from './services/analyticsService';
import { Toaster, toast } from 'sonner';
import { dataURLtoFile } from './utils/imageDataUrl';
import { getClosestAspectRatio } from './utils/aspectRatio';
import { useGeneratedImageDownload } from './hooks/useGeneratedImageDownload';
import { useAuthAndProfile } from './hooks/useAuthAndProfile';
import { useGlobalSettingsAndApiKey } from './hooks/useGlobalSettingsAndApiKey';
import { useHistoryImages } from './hooks/useHistoryImages';
import { usePendingUsersNotifier } from './hooks/usePendingUsersNotifier';
import { useImageGeneration } from './hooks/useImageGeneration';

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

  const openAdminDashboard = useCallback(() => {
    setIsAdminDashboardOpen(true);
  }, []);

  const resetAppState = useCallback(() => {
    setImage(null);
    setReferenceImages([]);
    setPrompts(['']);
    setError(null);
    setFullscreenImage(null);
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
    setCurrentView('create');
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

  const { historyImages, setHistoryImages, handleClearHistory } = useHistoryImages(user);

  const pendingUsersCount = usePendingUsersNotifier(
    userProfile?.role === 'admin',
    openAdminDashboard
  );

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

  const handleModelPreferenceChange = (newModel: string) => {
    const providerKey = getProviderKey();
    setUserModelPreference((prev) => {
      const next = { ...prev, [providerKey]: newModel };
      localStorage.setItem('preferred_generation_models', JSON.stringify(next));
      return next;
    });
  };

  const {
    isLoading,
    generatedImages,
    setGeneratedImages,
    handleGenerateClick,
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

  const handleOptionChange = (option: keyof typeof promptOptions) => {
    setPromptOptions(prevOptions => ({
      ...prevOptions,
      [option]: !prevOptions[option],
    }));
  };

  const handleBackgroundRemovalStrengthChange = (strength: 'soft' | 'strong') => {
    setPromptOptions(prev => ({ ...prev, backgroundRemovalStrength: strength }));
  };

  const handleImageSelect = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setImage({ file, previewUrl });
    
    const img = new Image();
    img.onload = () => {
      const closest = getClosestAspectRatio(img.naturalWidth, img.naturalHeight);
      setAspectRatio(closest);
    };
    img.src = previewUrl;

    setGeneratedImages([]);
    setError(null);
  }, []);
  
  const handleImageRemove = useCallback(() => {
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      setImage(null);
    }
    referenceImages.forEach(refImg => URL.revokeObjectURL(refImg.previewUrl));
    setReferenceImages([]);
    setGeneratedImages([]);
    setError(null);
  }, [image, referenceImages]);

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
      setError("Could not use this image as input.");
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
  }, [image, referenceImages]);

  const onDownloadTracked = useCallback(() => {
    if (user) {
      trackEvent('image_downloaded', { user_id: user.uid });
    }
  }, [user]);

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

  const canGenerate = prompts.some(p => p.trim() !== '') && !isLoading;

  if (isAuthLoading || isCheckingApiKey) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  if (userProfile && userProfile.status === 'rejected' && userProfile.role !== 'admin') {
    return <RejectedAccessScreen onLogout={handleLogout} />;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans overflow-hidden">
        <AppHeader
          user={user}
          userProfile={userProfile}
          currentView={currentView}
          onViewChange={setCurrentView}
          onSelectApiKey={handleSelectApiKey}
          pendingUsersCount={pendingUsersCount}
          onOpenAdminSettings={() => {
            setAdminInitialTab('settings');
            setIsAdminDashboardOpen(true);
          }}
          onOpenAdminUsers={() => {
            setAdminInitialTab('users');
            setIsAdminDashboardOpen(true);
          }}
          onOpenAdminAnalytics={() => {
            setAdminInitialTab('analytics');
            setIsAdminDashboardOpen(true);
          }}
          getEffectiveModel={getEffectiveModel}
          getProviderKey={getProviderKey}
          onModelPreferenceChange={handleModelPreferenceChange}
          onLogout={handleLogout}
        />

        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
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
              onShowStyleGuide={() => setIsStyleGuideVisible(true)}
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
            <main className="flex-shrink-0 lg:flex-1 bg-gray-900 flex flex-col lg:overflow-hidden">
              <MergeImage 
                onDownload={handleDownloadImage}
                onFullscreen={setFullscreenImage}
              />
            </main>
          )}
        </div>

        <AppFooter
          activeModelLabel={getEffectiveModel()}
          providerLabel={globalSettings?.defaultProvider || 'Gemini'}
        />
      </div>

      {isStyleGuideVisible && (
        <StyleGuideViewer
          onClose={() => setIsStyleGuideVisible(false)}
          onStyleSelect={handleStyleSelectFromGuide}
        />
      )}
      {fullscreenImage && (
        <FullscreenViewer 
            image={fullscreenImage} 
            onClose={() => setFullscreenImage(null)}
            onDownload={() => handleDownloadImage(fullscreenImage)}
            onForceRemoveBackgroundDownload={() => handleForceRemoveBackgroundDownload(fullscreenImage)}
            onUseAsInput={() => handleUseImageFromViewer(fullscreenImage)}
        />
      )}
      {isAdminDashboardOpen && (
        <AdminDashboard
          onClose={() => setIsAdminDashboardOpen(false)}
          initialTab={userProfile?.role === 'advice' ? 'analytics' : adminInitialTab}
          analyticsOnly={userProfile?.role === 'advice'}
        />
      )}
    </>
  );
};

export default App;
