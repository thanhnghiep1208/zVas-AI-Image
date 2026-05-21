import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useAdminSettings } from '../../hooks/useAdminSettings';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { UserHistoryModal } from './UserHistoryModal';
import { AnalyticsTabFallback } from './AnalyticsTabFallback';
import type { AdminDashboardProps, AdminTab } from './types';

const AnalyticsDashboard = lazy(() =>
  import('../AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard }))
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  initialTab = 'users',
  analyticsOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(analyticsOnly ? 'analytics' : initialTab);

  const {
    users,
    isLoading: isUsersLoading,
    loadUsersFromFirestore,
    handleUpdateStatus,
    handleUpdateRole,
    handleDeleteUser,
    selectedUserHistory,
    setSelectedUserHistory,
    userHistoryImages,
    isHistoryLoading,
  } = useAdminUsers();

  const settings = useAdminSettings();
  const { loadSettings } = settings;

  useEffect(() => {
    if (analyticsOnly) {
      setActiveTab('analytics');
    }
  }, [analyticsOnly]);

  useEffect(() => {
    if (analyticsOnly) {
      return undefined;
    }
    void loadUsersFromFirestore();
    void loadSettings();
    return undefined;
  }, [analyticsOnly, loadUsersFromFirestore, loadSettings]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--lp-void)] text-[var(--lp-text)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,var(--lp-glow-teal),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_100%_0%,var(--lp-glow-blue),transparent_45%)]"
        aria-hidden
      />

      <AdminDashboardHeader
        onClose={onClose}
        analyticsOnly={analyticsOnly}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userCount={users.length}
      />

      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 custom-scrollbar">
        <div className="mx-auto max-w-6xl space-y-8">
          {activeTab === 'users' && (
            <AdminUsersTab
              users={users}
              isLoading={isUsersLoading}
              onRefresh={() => void loadUsersFromFirestore()}
              onUpdateStatus={handleUpdateStatus}
              onUpdateRole={handleUpdateRole}
              onDeleteUser={handleDeleteUser}
              onViewHistory={(uid, email) => setSelectedUserHistory({ uid, email })}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              enabledProviders={settings.enabledProviders}
              onToggleProvider={settings.toggleEnabledProvider}
              geminiModel={settings.geminiModel}
              onGeminiModelChange={settings.setGeminiModel}
              seedanceModel={settings.seedanceModel}
              onSeedanceModelChange={settings.setSeedanceModel}
              seedanceBaseUrl={settings.seedanceBaseUrl}
              onSeedanceBaseUrlChange={settings.setSeedanceBaseUrl}
              seedreamModel={settings.seedreamModel}
              onSeedreamModelChange={settings.setSeedreamModel}
              seedreamBaseUrl={settings.seedreamBaseUrl}
              onSeedreamBaseUrlChange={settings.setSeedreamBaseUrl}
              isSavingSettings={settings.isSavingSettings}
              isTestingProvider={settings.isTestingProvider}
              onTestProvider={() => void settings.handleTestProvider()}
              onSaveSettings={() => void settings.handleSaveSettings()}
            />
          )}

          {activeTab === 'analytics' && (
            <section className="rounded-2xl border border-white/[0.06] bg-[var(--lp-surface)] p-4 backdrop-blur-sm sm:p-6">
              <Suspense fallback={<AnalyticsTabFallback />}>
                <AnalyticsDashboard readOnly={analyticsOnly} />
              </Suspense>
            </section>
          )}
        </div>
      </main>

      {selectedUserHistory && (
        <UserHistoryModal
          email={selectedUserHistory.email}
          images={userHistoryImages}
          isLoading={isHistoryLoading}
          onClose={() => setSelectedUserHistory(null)}
        />
      )}
    </div>
  );
};
