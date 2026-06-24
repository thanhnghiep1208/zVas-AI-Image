import React from 'react';
import {
  BarChart3,
  Users,
  Image as ImageIcon,
  CheckCircle,
  DollarSign,
  Activity,
  Clock,
} from 'lucide-react';
import { useAnalyticsDashboardData } from '../../hooks/useAnalyticsDashboardData';
import { formatAnalyticsBundleFetchedAt } from './constants';
import {
  KpiCard,
  LatencyCard,
  MonthlyBudgetCard,
  TokenUsageSection,
  ModelUsageCard,
  MetricRow,
  FailedGenerationsBox,
  AnalyticsPageSkeleton,
} from './AnalyticsWidgets';
import { DeferredTrendsSection } from './TrendsSection';
import { UserHistoryCountsPanel } from './UserHistoryCountsPanel';
import type { AnalyticsDashboardProps } from './types';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onErrorClick,
  latencyStats,
  readOnly = false,
}) => {
  const data = useAnalyticsDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
              <BarChart3 className="h-5 w-5 text-cyan-300" aria-hidden />
            </span>
            Tổng quan analytics
          </h2>
          <p className="mt-1 max-w-lg text-sm text-gray-500">
            Số liệu nội bộ theo tháng — tập trung vào người dùng, lượt tạo và chi phí.
          </p>
          <p className="mt-2 max-w-xl text-xs text-gray-600">
            Dữ liệu tự làm mới đầy đủ mỗi <span className="font-medium text-gray-400">6 giờ</span>.
            Dùng nút <span className="font-medium text-gray-400">Tải dữ liệu mới</span> khi cần cập
            nhật ngay.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-month" className="text-sm text-gray-500">
            Tháng
          </label>
          <input
            id="analytics-month"
            type="month"
            value={data.monthKey}
            onChange={(e) => data.setMonthKey(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            type="button"
            onClick={() => void data.handleRequestData(true)}
            disabled={data.isLoading}
            title="Luôn tải mới từ server, bỏ qua bản cache trên trình duyệt"
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {data.isLoading ? 'Đang tải...' : 'Tải dữ liệu mới'}
          </button>
        </div>
      </div>

      {data.dashboardBundleFetchedAt !== null && data.loadedMonthKey === data.monthKey && (
        <div className="-mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 sm:-mt-1">
          <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-500/75" aria-hidden />
          <span>
            Dữ liệu tổng quan tháng{' '}
            <span className="font-medium text-gray-400">{data.loadedMonthKey}</span> cập nhật lần
            cuối:{' '}
            <time
              dateTime={new Date(data.dashboardBundleFetchedAt).toISOString()}
              className="font-medium tabular-nums text-cyan-100/90"
            >
              {formatAnalyticsBundleFetchedAt(data.dashboardBundleFetchedAt)}
            </time>
          </span>
        </div>
      )}

      {data.isLoading ? (
        <AnalyticsPageSkeleton />
      ) : data.analytics ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Monthly Active Users"
              value={data.formatNumber(data.analytics.monthly_active_users)}
              icon={<Users className="w-5 h-5 text-blue-400" />}
            />
            <KpiCard
              title="Generating Users"
              value={data.formatNumber(data.analytics.generating_users)}
              icon={<Activity className="w-5 h-5 text-green-400" />}
            />
            <KpiCard
              title="Total Generations"
              value={data.formatNumber(data.analytics.total_generations)}
              icon={<ImageIcon className="w-5 h-5 text-purple-400" />}
            />
            <KpiCard
              title="Success Rate"
              value={`${data.analytics.success_rate.toFixed(1)}%`}
              icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
            />
            <KpiCard
              title="Top Model Used"
              value={data.topModelStats.modelName}
              icon={<Activity className="w-5 h-5 text-amber-400" />}
              subValue={`${data.formatNumber(data.topModelStats.requestCount)} requests`}
            />
            <KpiCard
              title="Total Monthly Cost"
              value={data.formatCurrency(data.analytics.total_monthly_cost)}
              icon={<DollarSign className="w-5 h-5 text-yellow-400" />}
            />
            <KpiCard
              title="Variable AI Cost"
              value={data.formatCurrency(data.analytics.total_variable_ai_cost)}
              icon={<DollarSign className="w-5 h-5 text-orange-400" />}
            />
            <LatencyCard latencyStats={latencyStats} />
            <KpiCard
              title="Cost / Success Image"
              value={data.formatCurrency(data.analytics.cost_per_successful_image)}
              icon={<DollarSign className="w-5 h-5 text-cyan-400" />}
            />
            <KpiCard
              title="Cost / Gen User"
              value={data.formatCurrency(data.analytics.cost_per_generating_user)}
              icon={<DollarSign className="w-5 h-5 text-indigo-400" />}
            />
            <MonthlyBudgetCard
              currentSpend={data.analytics.total_monthly_cost}
              budgetLimit={data.budgetLimit}
              budgetInput={data.budgetInput}
              isEditingBudget={data.isEditingBudget}
              onBudgetInputChange={data.setBudgetInput}
              onToggleEditing={() => data.setIsEditingBudget((prev) => !prev)}
              onSaveBudget={data.handleSaveBudget}
              readOnly={readOnly}
            />
          </div>

          <TokenUsageSection tokenStats={data.tokenStats} />

          <ModelUsageCard modelBreakdown={data.topModelStats.modelBreakdown} />

          <DeferredTrendsSection
            key={`trend-${data.monthKey}-${data.requestVersion}`}
            activeMetric={data.activeTrendMetric}
            onMetricChange={data.setActiveTrendMetric}
          />

          <UserHistoryCountsPanel key={`uh-${data.monthKey}-${data.requestVersion}`} monthKey={data.monthKey} />

          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-white">Chỉ số tạo ảnh</h3>
              <div className="space-y-3">
                <MetricRow
                  label="Successful Generations"
                  value={data.formatNumber(data.analytics.successful_generations)}
                />
                <MetricRow
                  label="Cost / 1K tokens"
                  value={`$${(data.tokenStats?.costPer1k ?? 0).toFixed(4)}`}
                />
                <MetricRow label="Most Used Model" value={data.topModelStats.modelName} />
                <MetricRow
                  label="Model Requests (month)"
                  value={data.formatNumber(data.topModelStats.requestCount)}
                />
                <MetricRow
                  label="Avg Gens / User"
                  value={data.analytics.average_generations_per_user.toFixed(1)}
                />
              </div>
            </div>

            <FailedGenerationsBox
              analytics={data.analytics}
              errorBreakdown={data.errorBreakdown}
              onClearLog={data.clearErrorBreakdown}
              onErrorClick={onErrorClick}
              monthKey={data.loadedMonthKey ?? data.monthKey}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-14 text-center text-sm text-gray-500">
          Chưa có dữ liệu cho tháng này (đang tải hoặc lỗi mạng). Nhấn{' '}
          <span className="font-semibold text-gray-300">Tải dữ liệu mới</span> để thử lại — hệ thống
          cũng tự làm mới mỗi 6 giờ.
        </div>
      )}
    </div>
  );
};
