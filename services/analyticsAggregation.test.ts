import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateHistoryCountsByUid,
  aggregateTrendPoints,
  buildMonthlyRollupDocument,
  monthBoundsFromKey,
  percentTrend,
} from './analyticsAggregation';
import { ANALYTICS_ROLLUP_VERSION } from './analyticsTypes';
import type { AnalyticsEventRecord } from '../repositories/analyticsRepository';

describe('analyticsAggregation', () => {
  it('monthBoundsFromKey parses YYYY-MM', () => {
    const { startDate, endDate } = monthBoundsFromKey('2026-03');
    assert.equal(startDate.getFullYear(), 2026);
    assert.equal(startDate.getMonth(), 2);
    assert.equal(endDate.getMonth(), 3);
  });

  it('percentTrend handles zero previous', () => {
    assert.equal(percentTrend(0, 0), 0);
    assert.equal(percentTrend(5, 0), 100);
    assert.equal(percentTrend(10, 5), 100);
  });

  it('aggregateHistoryCountsByUid sums per uid', () => {
    const counts = aggregateHistoryCountsByUid([
      { uid: 'a' },
      { uid: 'a' },
      { uid: 'b' },
      {},
    ]);
    assert.deepEqual(counts, { a: 2, b: 1 });
  });

  it('aggregateTrendPoints fills 30 daily buckets for generations', () => {
    const ref = new Date('2026-05-21T12:00:00Z');
    const day = new Date('2026-05-20T10:00:00Z');
    const events: AnalyticsEventRecord[] = [
      {
        event_name: 'image_generation_started',
        image_count: 2,
        timestamp: day,
      },
    ];
    const points = aggregateTrendPoints(events, 'generations', '30d', ref);
    assert.equal(points.length, 30);
    const total = points.reduce((sum, p) => sum + p.value, 0);
    assert.equal(total, 2);
  });

  it('buildMonthlyRollupDocument stamps version', () => {
    const doc = buildMonthlyRollupDocument('2026-04', {
      analytics: {
        monthly_active_users: 1,
        generating_users: 1,
        total_generations: 1,
        successful_generations: 1,
        failed_generations: 0,
        success_rate: 100,
        total_variable_ai_cost: 0,
        total_manual_infra_cost: 0,
        total_monthly_cost: 0,
        cost_per_successful_image: 0,
        cost_per_generating_user: 0,
        average_generations_per_user: 1,
      },
      errorBreakdown: [],
      tokenStats: {
        avgTotal: 0,
        avgInput: 0,
        avgOutput: 0,
        totalMonth: 0,
        costPer1k: 0,
        avgTotalTrend: 0,
        avgInputTrend: 0,
        avgOutputTrend: 0,
        totalMonthTrend: 0,
      },
      topModelStats: { modelName: 'x', requestCount: 0, modelBreakdown: [] },
    });
    assert.equal(doc.version, ANALYTICS_ROLLUP_VERSION);
    assert.equal(doc.monthKey, '2026-04');
  });
});
