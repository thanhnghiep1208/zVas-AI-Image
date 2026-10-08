/**
 * Script tạm (task 1.0 – tasks/tasks-gemini-nano-banana-2-1.md):
 * xác minh model ID Nano Banana 2.1, hỗ trợ 512px, usageMetadata và đo tốc độ.
 *
 * Chạy: npx tsx --env-file=.env.local scripts/verify-nano-banana-2-1.ts [modelId] [runs]
 */
import { GoogleGenAI } from '@google/genai';

const MODEL = process.argv[2] || 'gemini-nano-banana-2.1';
const RUNS = Number(process.argv[3] || 5);
const PROMPT = 'A cute red apple sticker on a white background';

async function callOnce(ai: GoogleGenAI, imageSize: string) {
  const started = Date.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: { parts: [{ text: PROMPT }] },
    config: { imageConfig: { aspectRatio: '1:1', imageSize } },
  });
  const ms = Date.now() - started;
  const hasImage = Boolean(
    response.candidates?.[0]?.content?.parts?.some((p) => p.inlineData?.data)
  );
  return { ms, hasImage, usage: response.usageMetadata };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  console.log(`\n== Model: ${MODEL} ==`);

  console.log('\n[1] 1K + usageMetadata');
  const first = await callOnce(ai, '1K');
  console.log({ ms: first.ms, hasImage: first.hasImage });
  console.log(JSON.stringify(first.usage, null, 2));

  console.log('\n[2] 512px');
  try {
    const r = await callOnce(ai, '512px');
    console.log({ ok: true, ms: r.ms, hasImage: r.hasImage });
  } catch (err) {
    console.log({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }

  console.log(`\n[3] Speed – ${RUNS} runs at 1K`);
  const times: number[] = [first.ms];
  for (let i = 1; i < RUNS; i++) {
    const r = await callOnce(ai, '1K');
    times.push(r.ms);
  }
  console.log({ times, min: Math.min(...times), max: Math.max(...times) });
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
