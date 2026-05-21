import React from 'react';
import { CheckCircle, Shield } from 'lucide-react';
import type { ProviderKey } from '../../constants/aiModels';

interface AdminSettingsTabProps {
  enabledProviders: ProviderKey[];
  onToggleProvider: (provider: ProviderKey) => void;
  geminiModel: string;
  onGeminiModelChange: (value: string) => void;
  seedanceModel: string;
  onSeedanceModelChange: (value: string) => void;
  seedanceBaseUrl: string;
  onSeedanceBaseUrlChange: (value: string) => void;
  seedreamModel: string;
  onSeedreamModelChange: (value: string) => void;
  seedreamBaseUrl: string;
  onSeedreamBaseUrlChange: (value: string) => void;
  isSavingSettings: boolean;
  isTestingProvider: boolean;
  onTestProvider: () => void;
  onSaveSettings: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  enabledProviders,
  onToggleProvider,
  geminiModel,
  onGeminiModelChange,
  seedanceModel,
  onSeedanceModelChange,
  seedanceBaseUrl,
  onSeedanceBaseUrlChange,
  seedreamModel,
  onSeedreamModelChange,
  seedreamBaseUrl,
  onSeedreamBaseUrlChange,
  isSavingSettings,
  isTestingProvider,
  onTestProvider,
  onSaveSettings,
}) => (
  <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--lp-surface)] p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/20 to-blue-600/10">
        <Shield className="h-7 w-7 text-cyan-200" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Cấu hình hệ thống</h2>
        <p className="mt-1 text-sm text-gray-500">
          Bật/tắt provider và chọn model runtime. API key hệ thống được quản lý phía server
          (secrets/env), không lưu ở client.
        </p>
      </div>
    </div>

    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Provider đang bật
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['gemini', 'openai', 'seedance', 'seedream'] as ProviderKey[]).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => onToggleProvider(provider)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                enabledProviders.includes(provider)
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-white shadow-[0_0_24px_-10px_rgba(34,211,238,0.45)]'
                  : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/25 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{provider.toUpperCase()}</span>
                {enabledProviders.includes(provider) && (
                  <CheckCircle className="h-4 w-4 text-cyan-300" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${enabledProviders.includes('gemini') ? 'border-cyan-500/35 bg-cyan-500/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'}`}
        >
          <h3 className="mb-3 text-sm font-semibold text-white">Gemini</h3>
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Model</label>
            <select
              value={geminiModel}
              onChange={(e) => onGeminiModelChange(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
              <option value="gemini-3.1-flash-image-preview">Nano Banana 2</option>
            </select>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${enabledProviders.includes('openai') ? 'border-cyan-500/35 bg-cyan-500/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'}`}
        >
          <h3 className="mb-3 text-sm font-semibold text-white">OpenAI</h3>
          <p className="text-xs text-gray-400">
            API key OpenAI được lấy từ server environment/secrets.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${enabledProviders.includes('seedance') ? 'border-cyan-500/35 bg-cyan-500/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'}`}
        >
          <h3 className="mb-3 text-sm font-semibold text-white">Seedance</h3>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              API key Seedance được lấy từ server environment/secrets.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Model</label>
                <input
                  type="text"
                  value={seedanceModel}
                  onChange={(e) => onSeedanceModelChange(e.target.value)}
                  placeholder="seed-1.5-pro"
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Base URL</label>
                <input
                  type="text"
                  value={seedanceBaseUrl}
                  onChange={(e) => onSeedanceBaseUrlChange(e.target.value)}
                  placeholder="https://api.seedance.com/v1"
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${enabledProviders.includes('seedream') ? 'border-cyan-500/35 bg-cyan-500/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'}`}
        >
          <h3 className="mb-3 text-sm font-semibold text-white">Seedream</h3>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              API key Seedream được lấy từ server environment/secrets.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Model</label>
                <input
                  type="text"
                  value={seedreamModel}
                  onChange={(e) => onSeedreamModelChange(e.target.value)}
                  placeholder="seedream-4.0"
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Base URL</label>
                <input
                  type="text"
                  value={seedreamBaseUrl}
                  onChange={(e) => onSeedreamBaseUrlChange(e.target.value)}
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] pt-6">
        <button
          onClick={onTestProvider}
          disabled={isTestingProvider || isSavingSettings}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-8 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTestingProvider ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200/35 border-t-cyan-100" />
              <span>Đang kiểm tra provider đang bật...</span>
            </>
          ) : (
            <span>Kiểm tra tất cả provider đang bật</span>
          )}
        </button>
        <button
          onClick={onSaveSettings}
          disabled={isSavingSettings}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          {isSavingSettings ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Đang lưu...</span>
            </>
          ) : (
            <span>Lưu tất cả cấu hình</span>
          )}
        </button>
        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
          <p className="text-xs leading-relaxed text-amber-200/90">
            <span className="mr-1 font-semibold text-amber-100">Hạn mức (quota):</span>
            Nếu bạn sử dụng API Key từ dự án MIỄN PHÍ (Free Tier), bạn sẽ bị giới hạn lượt tạo ảnh rất
            thấp (Dưới 1500 ảnh/ngày và giới hạn số lần tạo mỗi phút). Nếu gặp lỗi &quot;Quota
            Exceeded&quot;, vui lòng sử dụng API Key từ dự án có tính phí (Paid project) để có trải
            nghiệm ổn định hơn.
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-500/[0.08] p-4">
          <p className="text-xs leading-relaxed text-blue-200/90">
            <span className="mr-1 font-semibold text-blue-100">Bảo mật secrets:</span>
            API key không đi qua giao diện admin và không lưu trong Firestore. Hệ thống chỉ dùng
            secrets/env phía server khi generate hoặc test provider.
          </p>
        </div>
      </div>
    </div>
  </section>
);
