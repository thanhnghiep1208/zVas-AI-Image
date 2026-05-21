import { BACKGROUND_PROMPT_MAP, PROMPT_OPTIONS_MAP } from '../constants/promptModifiers';
import { findAiStyleBySelection } from './styleLibrary';

export interface PromptPipelineSlice {
  styleSimplified: boolean;
  keepStyle: boolean;
  keepStartImageStyle: boolean;
}

export interface BuildFinalPromptsParams {
  activePrompts: string[];
  selectedStyle: string;
  backgroundStyle: string;
  outlineType: 'none' | 'white' | 'black';
  outlineThickness: 'thin' | 'normal' | 'thick';
  promptOptions: PromptPipelineSlice;
  referenceImageCount: number;
  hasStartImage: boolean;
}

export function buildFinalPrompts(params: BuildFinalPromptsParams): string[] {
  const {
    activePrompts,
    selectedStyle,
    backgroundStyle,
    outlineType,
    outlineThickness,
    promptOptions,
    referenceImageCount,
    hasStartImage,
  } = params;

  return activePrompts.map((prompt) => {
    let finalPrompt = prompt.trim();

    const mappedStyle = findAiStyleBySelection(selectedStyle);

    if (mappedStyle) {
      finalPrompt = finalPrompt.replace(/,+$/, '').trim();
      finalPrompt += `, ${mappedStyle.prompt}`;
      if (mappedStyle.negative_prompt) {
        finalPrompt += `, avoid: ${mappedStyle.negative_prompt}`;
      }
    } else if (selectedStyle) {
      const parts = selectedStyle.split(':');
      const category = parts.length > 1 ? parts[0] : 'Style';
      const styleName = parts.length > 1 ? parts[1] : parts[0];

      if (styleName) {
        finalPrompt = finalPrompt.replace(/,+$/, '').trim();

        if (category === 'Illustration' || category === 'Vector art') {
          finalPrompt = `${category} of ${finalPrompt} ${styleName}`;
        } else if (category === '3D') {
          finalPrompt = `3D render of ${finalPrompt} ${styleName}`;
        } else {
          finalPrompt += ` ${styleName}`;
        }
      }
    }

    if (
      backgroundStyle !== 'none' &&
      BACKGROUND_PROMPT_MAP[backgroundStyle as keyof typeof BACKGROUND_PROMPT_MAP]
    ) {
      finalPrompt +=
        BACKGROUND_PROMPT_MAP[backgroundStyle as keyof typeof BACKGROUND_PROMPT_MAP];
    }

    if (outlineType !== 'none') {
      const thicknessStr =
        outlineThickness === 'thin'
          ? 'a fine'
          : outlineThickness === 'thick'
            ? 'a bold thick'
            : 'a solid';
      finalPrompt += `, add ${thicknessStr} ${outlineType} outline around the subject`;
    }

    if (promptOptions.styleSimplified) {
      finalPrompt += PROMPT_OPTIONS_MAP.styleSimplified;
    }
    if (promptOptions.keepStyle && referenceImageCount > 0) {
      finalPrompt += PROMPT_OPTIONS_MAP.keepStyle;
    }
    if (promptOptions.keepStartImageStyle && hasStartImage) {
      finalPrompt += PROMPT_OPTIONS_MAP.keepStartImageStyle;
    }
    return finalPrompt;
  });
}

export function buildEffectiveSettings(
  globalSettings: any,
  activeProvider: 'gemini' | 'openai' | 'seedance' | 'seedream',
  activeModel: string
) {
  return {
    ...globalSettings,
    activeProvider,
    geminiModel:
      activeProvider === 'gemini'
        ? activeModel
        : globalSettings?.geminiModel,
    openaiModel:
      activeProvider === 'openai'
        ? activeModel
        : globalSettings?.openaiModel || 'dall-e-3',
    seedanceModel:
      activeProvider === 'seedance'
        ? activeModel
        : globalSettings?.seedanceModel,
    seedreamModel:
      activeProvider === 'seedream'
        ? activeModel
        : globalSettings?.seedreamModel,
  };
}
