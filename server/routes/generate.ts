import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import type { Firestore } from 'firebase-admin/firestore';
import {
  openAiSizeFromAspectRatio,
  resolveProviderFromSettings,
  seedreamSizeFromAspectRatio,
} from '../lib/resolveProvider';
import type { AuthenticatedRequest, GenerateRequestBody } from '../types';
import { validatePrompt } from '../lib/validateUserInput';
import { validateHttpsBaseUrl } from '../lib/validateBaseUrl';
import { tryConsumeRateLimit } from '../lib/rateLimit/index';

export function createPostGenerateHandler(db: Firestore) {
  return async function postGenerate(req: Request, res: Response) {
    try {
      const { uid } = (req as AuthenticatedRequest).user;
      let rateLimitAllowed: boolean;
      try {
        rateLimitAllowed = await tryConsumeRateLimit(uid);
      } catch (err) {
        console.error('[ERROR] Rate limit backend unavailable:', err);
        return res.status(503).json({ error: 'rate_limit_unavailable' });
      }
      if (!rateLimitAllowed) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
      }

      const body = (req as AuthenticatedRequest & { body: GenerateRequestBody }).body;
      const settingsDoc = await db.collection('settings').doc('global').get();
      const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
      const provider = resolveProviderFromSettings(body.provider, settings.enabledProviders);
      const promptValidation = validatePrompt(body.prompt || '');
      if (!promptValidation.valid) {
        return res.status(400).json({ error: promptValidation.error });
      }
      const prompt = (body.prompt || '').trim();

      if (provider === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: 'OpenAI API Key chưa được cấu hình.' });
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: body.openaiModel || settings.openaiModel || 'dall-e-3',
            prompt,
            n: 1,
            size: openAiSizeFromAspectRatio(body.aspectRatio),
            quality: 'standard',
            response_format: 'b64_json',
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          return res.status(response.status).json({ error: err.error?.message || 'Lỗi từ OpenAI API' });
        }

        const data: { data?: Array<{ b64_json?: string; revised_prompt?: string }> } = await response.json();
        return res.json({
          imageBase64: data.data?.[0]?.b64_json || '',
          text: data.data?.[0]?.revised_prompt || '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
      }

      if (provider === 'seedance') {
        const apiKey = process.env.SEEDANCE_API_KEY;
        const baseUrlRaw = (body.seedanceBaseUrl || settings.seedanceBaseUrl || 'https://api.seedance.com/v1').trim();
        const model = body.seedanceModel || settings.seedanceModel || 'seed-1.5-pro';
        if (!apiKey) {
          return res.status(400).json({ error: 'Seedance API Key chưa được cấu hình.' });
        }
        const baseCheck = validateHttpsBaseUrl(baseUrlRaw, 'Seedance');
        if (baseCheck.ok === false) {
          return res.status(400).json({ error: baseCheck.error });
        }
        const baseUrl = baseCheck.normalized;

        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size: openAiSizeFromAspectRatio(body.aspectRatio),
            response_format: 'b64_json',
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          return res.status(response.status).json({ error: err.error?.message || 'Lỗi từ Seedance API' });
        }

        const data: { data?: Array<{ b64_json?: string; revised_prompt?: string }> } = await response.json();
        return res.json({
          imageBase64: data.data?.[0]?.b64_json || '',
          text: data.data?.[0]?.revised_prompt || '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
      }

      if (provider === 'seedream') {
        const apiKey = process.env.SEEDREAM_API_KEY;
        const baseUrlRaw = (
          body.seedreamBaseUrl ||
          settings.seedreamBaseUrl ||
          'https://ark.ap-southeast.bytepluses.com/api/v3'
        ).trim();
        const model = body.seedreamModel || settings.seedreamModel || 'seedream-5-0-260128';
        if (!apiKey) {
          return res.status(400).json({ error: 'Seedream API Key chưa được cấu hình.' });
        }
        const baseCheck = validateHttpsBaseUrl(baseUrlRaw, 'Seedream');
        if (baseCheck.ok === false) {
          return res.status(400).json({ error: baseCheck.error });
        }
        const baseUrl = baseCheck.normalized;

        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size: seedreamSizeFromAspectRatio(body.aspectRatio),
            response_format: 'b64_json',
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(async () => ({
            error: { message: await response.text() },
          }));
          return res.status(response.status).json({ error: err.error?.message || 'Lỗi từ Seedream API' });
        }

        const data: { data?: Array<{ b64_json?: string; revised_prompt?: string }> } = await response.json();
        return res.json({
          imageBase64: data.data?.[0]?.b64_json || '',
          text: data.data?.[0]?.revised_prompt || '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const geminiModel = body.geminiModel || settings.geminiModel || 'gemini-3.1-flash-image-preview';
      if (!geminiApiKey) {
        return res.status(400).json({ error: 'Gemini API key missing. Please contact admin.' });
      }

      const ai = new GoogleGenAI({ apiKey: String(geminiApiKey).trim() });
      const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [];

      if (body.mainImage?.data && body.mainImage?.mimeType) {
        parts.push({
          inlineData: {
            data: body.mainImage.data,
            mimeType: body.mainImage.mimeType,
          },
        });
      }

      if (Array.isArray(body.referenceImages)) {
        for (const ref of body.referenceImages) {
          if (ref?.data && ref?.mimeType) {
            parts.push({
              inlineData: {
                data: ref.data,
                mimeType: ref.mimeType,
              },
            });
          }
        }
      }

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: body.aspectRatio || '1:1',
            imageSize: body.imageSize || '1K',
          },
        },
      });

      let imageBase64 = '';
      let text = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
          } else if (part.text) {
            text = part.text;
          }
        }
      }

      if (!imageBase64) {
        return res.status(500).json({ error: 'No image was generated by the model.' });
      }

      const usage = response.usageMetadata || {};
      return res.json({
        imageBase64,
        text,
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens:
          usage.totalTokenCount ||
          (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
      });
    } catch (error: unknown) {
      console.error('Generate API error:', error);
      const message = error instanceof Error ? error.message : 'Generation failed.';
      return res.status(500).json({ error: message });
    }
  };
}
