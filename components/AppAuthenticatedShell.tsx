import React, { useState, useCallback, lazy, Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { GeneratedImage } from '../types';
import type { UserProfile } from '../hooks/useAuthAndProfile';
import type { ProviderModelOption, ProviderKey } from '../constants/aiModels';
import { AppHeaderWithPending } from './layout/AppHeaderWithPending';
import type { AppView } from './layout/AppHeader';
import { AppFooter } from './layout/AppFooter';
import { trackEvent } from '../services/analyticsService';
import { ga4FileDownload, ga4SelectContent } from '../utils/gtagEvent';
import { Toaster } from 'sonner';
import { useGeneratedImageDownload } from '../hooks/useGeneratedImageDownload';
import { useWorkspaceController } from '../hooks/useWorkspaceController';

const AdminDashboard = lazy(() =>
  import('./AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const preloadAdminDashboard = () => import('./AdminDashboard');

const CreateView = lazy(() =>
  import('./views/CreateView').then((m) => ({ default: m.CreateView }))
);
const MultipleImage = lazy(() =>
  import('./MultipleImage').then((m) => ({ default: m.MultipleImage }))
);
const MergeImage = lazy(() =>
  import('./MergeImage').then((m) => ({ default: m.MergeImage }))
);
const StyleGuideViewer = lazy(() =>
  import('./StyleGuideViewer').then((m) => ({ default: m.StyleGuideViewer }))
);
const FullscreenViewer = lazy(() =>
  import('./FullscreenViewer').then((m) => ({ default: m.FullscreenViewer }))
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

export interface AppAuthenticatedShellProps {
  user: User;
  userProfile: UserProfile | null;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  globalSettings: unknown;
  systemApiKey: string | null;
  availableModelOptions: ProviderModelOption[];
  getProviderKey: () => ProviderKey;
  getEffectiveModel: () => string;
  getSelectedModelKey: () => string;
  isProviderKeyConfigured: (provider: ProviderKey) => boolean;
  onModelPreferenceChange: (modelKey: string) => void;
  onSelectApiKey: () => Promise<void>;
  onLogout: () => void;
}

export const AppAuthenticatedShell: React.FC<AppAuthenticatedShellProps> = ({
  user,
  userProfile,
  error,
  setError,
  globalSettings,
  systemApiKey,
  availableModelOptions,
  getProviderKey,
  getEffectiveModel,
  getSelectedModelKey,
  isProviderKeyConfigured,
  onModelPreferenceChange,
  onSelectApiKey,
  onLogout,
}) => {
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'analytics' | 'users' | 'settings'>('users');

  const workspace = useWorkspaceController({
    user,
    setError,
    globalSettings,
    systemApiKey,
    getProviderKey,
    getEffectiveModel,
    isProviderKeyConfigured,
  });

  const openAdminDashboard = useCallback(() => {
    ga4SelectContent('admin', 'users_toast');
    setIsAdminDashboardOpen(true);
  }, []);

  const handleOpenAdminSettings = useCallback(() => {
    ga4SelectContent('admin', 'settings');
    setAdminInitialTab('settings');
    setIsAdminDashboardOpen(true);
  }, []);

  const handleOpenAdminUsers = useCallback(() => {
    ga4SelectContent('admin', 'users');
    setAdminInitialTab('users');
    setIsAdminDashboardOpen(true);
  }, []);

  const handleOpenAdminAnalytics = useCallback(() => {
    ga4SelectContent('admin', 'analytics');
    setAdminInitialTab('analytics');
    setIsAdminDashboardOpen(true);
  }, []);

  const handlePrefetchAdminDashboard = useCallback(() => {
    void preloadAdminDashboard();
  }, []);

  const handleWorkspaceViewChange = useCallback((view: AppView) => {
    ga4SelectContent('app_tab', view);
    workspace.setCurrentView(view);
  }, [workspace.setCurrentView]);

  const handleCloseAdminDashboard = useCallback(() => {
    setIsAdminDashboardOpen(false);
  }, []);

  const onDownloadTracked = useCallback(
    (meta: { exportType: 'jpg' | 'png'; removeBackground: boolean }) => {
      trackEvent('image_downloaded', {
        user_id: user.uid,
        generation_type: workspace.currentView,
        image_count: 1,
        export_type: meta.exportType,
        remove_background: meta.removeBackground,
      });
      ga4FileDownload({
        file_extension: meta.exportType,
        remove_background: meta.removeBackground,
        generation_view: workspace.currentView,
      });
    },
    [user.uid, workspace.currentView]
  );

  const { handleDownloadImage, handleForceRemoveBackgroundDownload } = useGeneratedImageDownload({
    backgroundStyle: workspace.backgroundStyle,
    promptOptions: {
      forceRemoveBackground: workspace.promptOptions.forceRemoveBackground,
      backgroundRemovalStrength: workspace.promptOptions.backgroundRemovalStrength,
    },
    onDownloadTracked,
  });

  const handleUseImageFromViewer = useCallback(
    async (generatedImage: GeneratedImage) => {
      await workspace.handleUseImageAsInput(generatedImage);
      workspace.setFullscreenImage(null);
    },
    [workspace]
  );

  const handleCloseFullscreen = useCallback(() => {
    workspace.setFullscreenImage(null);
  }, [workspace]);

  const handleFullscreenDownload = useCallback(() => {
    if (workspace.fullscreenImage) {
      void handleDownloadImage(workspace.fullscreenImage);
    }
  }, [workspace.fullscreenImage, handleDownloadImage]);

  const handleFullscreenForceRemoveBackgroundDownload = useCallback(() => {
    if (workspace.fullscreenImage) {
      void handleForceRemoveBackgroundDownload(workspace.fullscreenImage);
    }
  }, [workspace.fullscreenImage, handleForceRemoveBackgroundDownload]);

  const handleFullscreenUseAsInput = useCallback(() => {
    if (workspace.fullscreenImage) {
      void handleUseImageFromViewer(workspace.fullscreenImage);
    }
  }, [workspace.fullscreenImage, handleUseImageFromViewer]);

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
            currentView={workspace.currentView}
            onViewChange={handleWorkspaceViewChange}
            onSelectApiKey={onSelectApiKey}
            onPendingToastOpen={openAdminDashboard}
            onOpenAdminSettings={handleOpenAdminSettings}
            onOpenAdminUsers={handleOpenAdminUsers}
            onOpenAdminAnalytics={handleOpenAdminAnalytics}
            onPrefetchAdminDashboard={handlePrefetchAdminDashboard}
            getEffectiveModel={getEffectiveModel}
            getProviderKey={getProviderKey}
            selectedModelKey={getSelectedModelKey()}
            availableModelOptions={availableModelOptions}
            onModelPreferenceChange={onModelPreferenceChange}
            onLogout={onLogout}
            onLogoWorkspaceRefresh={workspace.handleLogoWorkspaceRefresh}
          />

          <div
            key={workspace.workspaceMountKey}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
          >
            <Suspense fallback={<WorkspaceViewFallback />}>
              {workspace.currentView === 'create' ? (
                <CreateView
                  prompts={workspace.prompts}
                  setPrompts={workspace.setPrompts}
                  promptOptions={workspace.promptOptions}
                  onOptionChange={workspace.handleOptionChange}
                  onBackgroundRemovalStrengthChange={workspace.handleBackgroundRemovalStrengthChange}
                  backgroundStyle={workspace.backgroundStyle}
                  onBackgroundStyleChange={workspace.setBackgroundStyle}
                  selectedStyle={workspace.selectedStyle}
                  onSelectedStyleChange={workspace.setSelectedStyle}
                  outlineType={workspace.outlineType}
                  onOutlineTypeChange={workspace.setOutlineType}
                  outlineThickness={workspace.outlineThickness}
                  onOutlineThicknessChange={workspace.setOutlineThickness}
                  image={workspace.image}
                  referenceImages={workspace.referenceImages}
                  onImageSelect={workspace.handleImageSelect}
                  onImageRemove={workspace.handleImageRemove}
                  onAddReferenceImage={workspace.handleAddReferenceImage}
                  onRemoveReferenceImage={workspace.handleRemoveReferenceImage}
                  aspectRatio={workspace.aspectRatio}
                  onAspectRatioChange={workspace.setAspectRatio}
                  imageSize={workspace.imageSize}
                  onImageSizeChange={workspace.setImageSize}
                  onShowStyleGuide={() => workspace.setIsStyleGuideVisible(true)}
                  onGenerate={workspace.handleGenerateClick}
                  canGenerate={workspace.canGenerate}
                  isLoading={workspace.isLoading}
                  error={error}
                  generatedImages={workspace.generatedImages}
                  historyImages={workspace.historyImages}
                  onFullscreen={workspace.setFullscreenImage}
                  onUseAsInput={workspace.handleUseImageAsInput}
                  onDownload={handleDownloadImage}
                  onForceRemoveBackgroundDownload={handleForceRemoveBackgroundDownload}
                  onClearHistory={workspace.handleClearHistory}
                />
              ) : workspace.currentView === 'multiple' ? (
                <MultipleImage
                  image={workspace.image}
                  onImageSelect={workspace.handleImageSelect}
                  onImageRemove={workspace.handleImageRemove}
                  prompts={workspace.prompts}
                  setPrompts={workspace.setPrompts}
                  onGenerate={workspace.handleGenerateClick}
                  isLoading={workspace.isLoading}
                  error={error}
                  generatedImages={workspace.generatedImages}
                  historyImages={workspace.historyImages}
                  onFullscreen={workspace.setFullscreenImage}
                  onUseAsInput={workspace.handleUseImageAsInput}
                  onDownload={handleDownloadImage}
                  onForceRemoveBackgroundDownload={handleForceRemoveBackgroundDownload}
                  onClearHistory={workspace.handleClearHistory}
                />
              ) : (
                <main className="flex min-h-0 flex-shrink-0 flex-col lg:flex-1 lg:overflow-hidden">
                  <MergeImage
                    onDownload={handleDownloadImage}
                    onFullscreen={workspace.setFullscreenImage}
                  />
                </main>
              )}
            </Suspense>
          </div>

          <AppFooter
            activeModelLabel={getEffectiveModel()}
            providerLabel={getProviderKey().toUpperCase()}
          />
        </div>
      </div>

      {workspace.isStyleGuideVisible && (
        <Suspense fallback={<ModalLoadingOverlay />}>
          <StyleGuideViewer
            onClose={() => workspace.setIsStyleGuideVisible(false)}
            onStyleSelect={workspace.handleStyleSelectFromGuide}
          />
        </Suspense>
      )}
      {workspace.fullscreenImage && (
        <Suspense fallback={<ModalLoadingOverlay />}>
          <FullscreenViewer
            image={workspace.fullscreenImage}
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
