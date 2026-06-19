import React, { useState, useEffect, useRef } from 'react';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useTrendData } from '../../hooks/useTrendData';
import { TREND_METRIC_CONFIG } from './constants';
import { TrendSkeleton } from './AnalyticsWidgets';
import type { TrendMetric } from '../../services/analyticsTypes';

const TrendsChart = ({
  activeMetric,
  onMetricChange,
}: {
  activeMetric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
}) => {
  const config = TREND_METRIC_CONFIG[activeMetric];
  const { data, isLoading, error } = useTrendData(activeMetric, config.range);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-white">Xu hướng</h3>
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {(Object.keys(TREND_METRIC_CONFIG) as TrendMetric[]).map((metric) => (
            <button
              key={metric}
              type="button"
              onClick={() => onMetricChange(metric)}
              className={`rounded-lg px-3 py-1.5 text-xs transition-all sm:text-sm ${
                activeMetric === metric
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/25 font-medium text-white ring-1 ring-cyan-500/30'
                  : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
              }`}
            >
              {TREND_METRIC_CONFIG[metric].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <TrendSkeleton />
      ) : error ? (
        <div className="h-72 flex items-center justify-center text-sm text-red-400">{error}</div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={data} margin={{ top: 10, right: 8, left: -15, bottom: 8 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.55} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#cbd5e1' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: config.color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const DeferredTrendsSection = ({
  activeMetric,
  onMetricChange,
}: {
  activeMetric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
}) => {
  const [mountChart, setMountChart] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el || mountChart) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMountChart(true);
      },
      { root: null, rootMargin: '160px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mountChart]);

  return (
    <div>
      <div ref={anchorRef} className="h-px w-full" aria-hidden />
      {mountChart ? (
        <TrendsChart activeMetric={activeMetric} onMetricChange={onMetricChange} />
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-center text-sm text-gray-500">
          <span>Cuộn tới mục xu hướng để tải biểu đồ</span>
          <span className="text-xs text-gray-600">(tránh gọi Firestore trend khi chưa cần)</span>
        </div>
      )}
    </div>
  );
};
