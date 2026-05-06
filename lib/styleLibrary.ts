import aiStylesData from '../ai_styles.json';

export interface AiStyle {
  id: string;
  name: string;
  category: string;
  emoji?: string;
  prompt: string;
  negative_prompt?: string;
  params?: {
    steps?: number;
    cfg_scale?: number;
    sampler?: string;
    aspect_ratio?: string;
  };
}

const AI_STYLES: AiStyle[] = (aiStylesData as AiStyle[]) ?? [];

const normalize = (value: string) => value.trim().toLowerCase();

const getStyleNameFromSelection = (selectedStyle: string) => {
  const [first, second] = selectedStyle.split(':');
  return second ? second.trim() : first.trim();
};

export function findAiStyleBySelection(selectedStyle: string): AiStyle | null {
  if (!selectedStyle) {
    return null;
  }

  const raw = selectedStyle.trim();
  if (!raw) {
    return null;
  }

  const candidateName = getStyleNameFromSelection(raw);
  const normalizedRaw = normalize(raw);
  const normalizedCandidateName = normalize(candidateName);

  const match =
    AI_STYLES.find((style) => normalize(style.id) === normalizedRaw) ||
    AI_STYLES.find((style) => normalize(style.name) === normalizedRaw) ||
    AI_STYLES.find((style) => normalize(style.id) === normalizedCandidateName) ||
    AI_STYLES.find((style) => normalize(style.name) === normalizedCandidateName);

  return match ?? null;
}
