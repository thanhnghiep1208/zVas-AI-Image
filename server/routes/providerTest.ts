import type { Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { resolveProviderFromSettings } from '../lib/resolveProvider';
import type { AuthenticatedRequest, ProviderTestRequestBody } from '../types';

function validateHttpsBaseUrl(
  baseUrl: string,
  provider: string
): { ok: true; normalized: string } | { ok: false; error: string } {
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    return { ok: false, error: `${provider} base URL không hợp lệ.` };
  }
  if (parsedBaseUrl.protocol !== 'https:') {
    return { ok: false, error: `${provider} base URL phải dùng https://` };
  }
  return { ok: true, normalized: baseUrl.replace(/\/+$/, '') };
}

export function createPostProviderTestHandler(db: Firestore) {
  return async function postProviderTest(req: Request, res: Response) {
    try {
      const body = ((req as AuthenticatedRequest).body || {}) as ProviderTestRequestBody;
      const settingsDoc = await db.collection('settings').doc('global').get();
      const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
      const provider = resolveProviderFromSettings(body.provider, settings.enabledProviders);

      if (provider === 'openai') {
        const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
        if (!apiKey) {
          return res.status(400).json({
            ok: false,
            provider,
            error: 'OpenAI API Key chưa được cấu hình.',
          });
        }

        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            ok: false,
            provider,
            error: `OpenAI test failed (HTTP ${response.status})`,
            detail: errText.slice(0, 240),
          });
        }

        return res.json({
          ok: true,
          provider,
          message: 'Kết nối OpenAI thành công.',
        });
      }

      if (provider === 'seedance') {
        const apiKey = String(process.env.SEEDANCE_API_KEY || '').trim();
        const baseUrlRaw =
          (body.seedanceBaseUrl || '').trim() ||
          String(settings.seedanceBaseUrl || 'https://api.seedance.com/v1').trim();
        if (!apiKey) {
          return res.status(400).json({
            ok: false,
            provider,
            error: 'Seedance API Key chưa được cấu hình.',
          });
        }
        const baseCheck = validateHttpsBaseUrl(baseUrlRaw, 'Seedance');
        if (baseCheck.ok === false) {
          return res.status(400).json({ ok: false, provider, error: baseCheck.error });
        }
        const seedanceBase = baseCheck.normalized;

        const response = await fetch(`${seedanceBase}/models`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            ok: false,
            provider,
            error: `Seedance test failed (HTTP ${response.status})`,
            detail: errText.slice(0, 240),
          });
        }

        return res.json({
          ok: true,
          provider,
          message: 'Kết nối Seedance thành công.',
        });
      }

      if (provider === 'seedream') {
        const apiKey = String(process.env.SEEDREAM_API_KEY || '').trim();
        const baseUrlRaw =
          (body.seedreamBaseUrl || '').trim() ||
          String(settings.seedreamBaseUrl || 'https://ark.cn-beijing.volces.com/api/v3').trim();
        if (!apiKey) {
          return res.status(400).json({
            ok: false,
            provider,
            error: 'Seedream API Key chưa được cấu hình.',
          });
        }
        const baseCheck = validateHttpsBaseUrl(baseUrlRaw, 'Seedream');
        if (baseCheck.ok === false) {
          return res.status(400).json({ ok: false, provider, error: baseCheck.error });
        }
        const seedreamBase = baseCheck.normalized;

        const response = await fetch(`${seedreamBase}/models`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({
            ok: false,
            provider,
            error: `Seedream test failed (HTTP ${response.status})`,
            detail: errText.slice(0, 240),
          });
        }

        return res.json({
          ok: true,
          provider,
          message: 'Kết nối Seedream thành công.',
        });
      }

      const geminiApiKey = String(process.env.GEMINI_API_KEY || '').trim();
      if (!geminiApiKey) {
        return res.status(400).json({
          ok: false,
          provider: 'gemini',
          error: 'Gemini API Key chưa được cấu hình.',
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`,
        { method: 'GET' }
      );
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          ok: false,
          provider: 'gemini',
          error: `Gemini test failed (HTTP ${response.status})`,
          detail: errText.slice(0, 240),
        });
      }

      return res.json({
        ok: true,
        provider: 'gemini',
        message: 'Kết nối Gemini thành công.',
      });
    } catch (error: unknown) {
      console.error('Provider test error:', error);
      const message = error instanceof Error ? error.message : 'Provider test failed.';
      return res.status(500).json({
        ok: false,
        error: message,
      });
    }
  };
}
