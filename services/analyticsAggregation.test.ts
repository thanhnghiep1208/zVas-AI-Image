import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateHistoryCountsByUid,
  aggregateTrendPoints,
  buildMonthlyErrorBreakdownFromEvents,
  buildMonthlyFailureStatsFromEvents,
  buildMonthlyRollupDocument,
  monthBoundsFromKey,
  percentTrend,
} from './analyticsAggregation';
import { ANALYTICS_ROLLUP_VERSION } from './analyticsTypes';
import type { AnalyticsEventRecord } from '../data/analyticsRepository';

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
      failureStats: { bySource: { user: 0, client: 0, system: 0 }, byModel: [], byUser: [] },
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

describe('buildMonthlyErrorBreakdownFromEvents — error types', () => {
  const failed = (error_code: string) =>
    ({ event_name: 'image_generation_failed', user_id: 'u', error_code, image_count: 1 }) as AnalyticsEventRecord;
  const typeOf = (code: string) => buildMonthlyErrorBreakdownFromEvents([failed(code)])[0]?.errorType;

  it('labels file_read_failed instead of falling into Unknown Error', () => {
    assert.equal(typeOf('file_read_failed'), 'File Read Failed');
  });

  it('labels server-provided codes from Phase 0', () => {
    assert.equal(typeOf('payload_too_large'), 'Payload Too Large (413)');
    assert.equal(typeOf('content_filter'), 'Content Filter');
    assert.equal(typeOf('no_output'), 'No Output');
  });
});

describe('buildMonthlyErrorBreakdownFromEvents — legacy events', () => {
  it('falls back to the raw message when error_code is unknown_error', () => {
    const rows = buildMonthlyErrorBreakdownFromEvents([
      {
        event_name: 'image_generation_failed',
        user_id: 'u',
        error_code: 'unknown_error',
        error_message_short: 'Request payload too large. Please use a smaller image or compress before upload.',
      } as AnalyticsEventRecord,
    ]);
    assert.equal(rows[0].errorType, 'Payload Too Large (413)');
    assert.equal(rows[0].source, 'user');
  });
});

describe('buildMonthlyFailureStatsFromEvents', () => {
  const ev = (event_name: string, user_id: string, model_name: string, extra: Partial<AnalyticsEventRecord> = {}) =>
    ({ event_name, user_id, model_name, image_count: 1, ...extra }) as AnalyticsEventRecord;

  const events = [
    ev('image_generation_started', 'a', 'flash'),
    ev('image_generation_started', 'a', 'flash'),
    ev('image_generation_started', 'a', 'flash'),
    ev('image_generation_started', 'a', 'flash'),
    ev('image_generation_started', 'b', 'pro'),
    ev('image_generation_started', 'b', 'pro'),
    ev('image_generation_failed', 'a', 'flash', { error_code: 'payload_too_large' }),
    ev('image_generation_failed', 'a', 'flash', { error_code: 'payload_too_large' }),
    ev('image_generation_failed', 'a', 'flash', { error_code: 'network_error' }),
    ev('image_generation_failed', 'b', 'pro', { error_code: 'service_unavailable' }),
  ];

  it('splits failures by source', () => {
    assert.deepEqual(buildMonthlyFailureStatsFromEvents(events).bySource, { user: 2, client: 1, system: 1 });
  });

  it('computes failure rate per model, worst first', () => {
    assert.deepEqual(buildMonthlyFailureStatsFromEvents(events).byModel, [
      { modelName: 'flash', attempts: 4, failed: 3, failRate: 75, topErrorType: 'Payload Too Large (413)' },
      { modelName: 'pro', attempts: 2, failed: 1, failRate: 50, topErrorType: 'Service Unavailable (503)' },
    ]);
  });

  it('ranks users by failures with their share of all failures', () => {
    const [first, second] = buildMonthlyFailureStatsFromEvents(events).byUser;
    assert.deepEqual(first, {
      userId: 'a',
      attempts: 4,
      failed: 3,
      shareOfFailures: 75,
      topErrorType: 'Payload Too Large (413)',
    });
    assert.equal(second.userId, 'b');
  });

  it('caps the user list', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      ev('image_generation_failed', `u${i}`, 'flash', { error_code: 'timeout' })
    );
    assert.equal(buildMonthlyFailureStatsFromEvents(many).byUser.length, 10);
  });
});
