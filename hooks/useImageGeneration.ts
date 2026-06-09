import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { ImageFile, GeneratedImage, ImageSize, GlobalSettings } from '../types';
import { generateImageVariations } from '../services/geminiService';
import { trackEvent, trackEvents } from '../services/analyticsService';
import {
  ga4BeginCheckout,
  ga4Exception,
  ga4Purchase,
  newGa4TransactionId,
} from '../utils/gtagEvent';
import {
  handleFirestoreError,
  OperationType,
} from '../firebase';
import * as idb from 'idb-keyval';
import { buildFinalPrompts, buildEffectiveSettings } from '../lib/buildGenerationPrompts';
import { createHistoryEntry } from '../data/historyRepository';
import { describeApiOrNetworkError } from '../utils/userFacingError';
import type { ProviderKey } from '../constants/aiModels';
import { providerKeyMissingMessage } from '../utils/providerKeyMessages';

export interface UseImageGenerationParams {
  user: User | null;
  prompts: string[];
  image: ImageFile | null;
  referenceImages: ImageFile[];
  aspectRatio: string;
  imageSize: ImageSize;
  selectedStyle: string;
  backgroundStyle: string;
  outlineType: 'none' | 'white' | 'black';
  outlineThickness: 'thin' | 'normal' | 'thick';
  promptOptions: {
    styleSimplified: boolean;
    keepStyle: boolean;
    keepStartImageStyle: boolean;
    forceRemoveBackground: boolean;
    backgroundRemovalStrength: 'soft' | 'strong';
  };
  globalSettings: GlobalSettings | null;
  systemApiKey: string | null;
  getProviderKey: () => ProviderKey;
  getEffectiveModel: () => string;
  isProviderKeyConfigured: (provider: ProviderKey) => boolean;
  currentView: 'create' | 'merge' | 'multiple';
  setHistoryImages: Dispatch<SetStateAction<GeneratedImage[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function useImageGeneration(params: UseImageGenerationParams) {
  const {
    user,
    prompts,
    image,
    referenceImages,
    aspectRatio,
    imageSize,
    selectedStyle,
    backgroundStyle,
    outlineType,
    outlineThickness,
    promptOptions,
    globalSettings,
    systemApiKey,
    getProviderKey,
    getEffectiveModel,
    isProviderKeyConfigured,
    currentView,
    setHistoryImages,
    setError,
  } = params;

  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    if (!user) {
      setGeneratedImages([]);
      setIsLoading(false);
    }
  }, [user]);

  const handleGenerateClick = async () => {
    const activePrompts = prompts.filter((p) => p.trim() !== '');
    if (activePrompts.length === 0) {
      setError('Vui lòng cung cấp ít nhất một mô tả.');
      return;
    }

    const activeProvider = getProviderKey();
    if (!isProviderKeyConfigured(activeProvider)) {
      setError(providerKeyMissingMessage(activeProvider));
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    const runtimeSystemApiKey = systemApiKey || null;

    const finalPrompts = buildFinalPrompts({
      activePrompts,
      selectedStyle,
      backgroundStyle,
      outlineType,
      outlineThickness,
      promptOptions: {
        styleSimplified: promptOptions.styleSimplified,
        keepStyle: promptOptions.keepStyle,
        keepStartImageStyle: promptOptions.keepStartImageStyle,
      },
      referenceImageCount: referenceImages.length,
      hasStartImage: !!image,
    });

    console.log('DEBUG: handleGenerateClick triggered');
    const startTime = Date.now();
    const activeModel = getEffectiveModel();
    const effectiveSettings = buildEffectiveSettings(globalSettings, activeProvider, activeModel);
    const ga4TransactionId = newGa4TransactionId();

    if (user) {
      trackEvent('image_generation_started', {
        user_id: user.uid,
        model_name: activeModel,
        generation_type: currentView,
        image_count: finalPrompts.length,
      });
      ga4BeginCheckout({
        value: 0,
        items: [
          {
            item_id: activeModel,
            item_name: activeModel,
            quantity: Math.max(1, finalPrompts.length),
            price: 0,
          },
        ],
      });
    }

    try {
      const results = await generateImageVariations(
        image?.file ?? null,
        finalPrompts,
        referenceImages.map((img) => img.file),
        null,
        aspectRatio,
        imageSize,
        runtimeSystemApiKey,
        effectiveSettings
      );
      setGeneratedImages(results);

      const durationMs = Date.now() - startTime;
      const validResults = results.filter((img) => img.imageUrl !== 'error');
      const failedResults = results.filter((img) => img.imageUrl === 'error');

      if (user) {
        if (validResults.length > 0) {
          let estimatedCost = 0;
          if (activeModel.includes('dall-e-3')) estimatedCost = validResults.length * 0.04;
          else if (activeModel.includes('gemini')) estimatedCost = validResults.length * 0.03;
          else estimatedCost = validResults.length * 0.01;

          const promptTokens = validResults.reduce(
            (sum, img) => sum + (img.promptTokens || 0),
            0
          );
          const completionTokens = validResults.reduce(
            (sum, img) => sum + (img.completionTokens || 0),
            0
          );
          const totalTokens = validResults.reduce(
            (sum, img) => sum + (img.totalTokens || 0),
            0
          );

          const qty = Math.max(1, validResults.length);
          ga4Purchase({
            transaction_id: ga4TransactionId,
            value: estimatedCost,
            items: [
              {
                item_id: activeModel,
                item_name: activeModel,
                quantity: qty,
                price: estimatedCost / qty,
              },
            ],
          });

          const batchEvents: Array<{ name: Parameters<typeof trackEvents>[0][0]['name']; payload: Parameters<typeof trackEvents>[0][0]['payload'] }> = [
            {
              name: 'image_generation_succeeded',
              payload: {
                user_id: user.uid,
                model_name: activeModel,
                generation_type: currentView,
                image_count: validResults.length,
                duration_ms: durationMs,
                estimated_api_cost: estimatedCost,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
              },
            },
          ];
          if (failedResults.length > 0) {
            ga4Exception(String(failedResults[0]?.text || 'image_generation_failed'), false);
            batchEvents.push({
              name: 'image_generation_failed',
              payload: {
                user_id: user.uid,
                model_name: activeModel,
                generation_type: currentView,
                image_count: failedResults.length,
                duration_ms: durationMs,
                error_code: failedResults[0]?.text || 'unknown_error',
              },
            });
          }
          void trackEvents(batchEvents);
        }
        if (failedResults.length > 0 && validResults.length === 0) {
          trackEvent('image_generation_failed', {
            user_id: user.uid,
            model_name: activeModel,
            generation_type: currentView,
            image_count: failedResults.length,
            duration_ms: durationMs,
            error_code: failedResults[0]?.text || 'unknown_error',
          });
          ga4Exception(String(failedResults[0]?.text || 'image_generation_failed'), false);
        }
      }

      if (validResults.length > 0 && user) {
        for (const res of validResults) {
          const path = 'history';
          try {
            const historyId = await createHistoryEntry({
              userId: user.uid,
              prompt: res.prompt,
              text: res.text
            });

            await idb.set(`img_${historyId}`, res.imageUrl);

            setHistoryImages((prev) => {
              const newEntry = {
                prompt: res.prompt,
                imageUrl: res.imageUrl,
                text: res.text,
              };
              return [newEntry, ...prev].slice(0, 10);
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, path);
          }
        }
      }
    } catch (err: unknown) {
      console.error('Generation error:', err);

      let errorMessage = 'Lỗi không xác định khi tạo ảnh.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err);
      }

      setError(describeApiOrNetworkError(errorMessage));

      if (user) {
        trackEvent('image_generation_failed', {
          user_id: user.uid,
          model_name: activeModel,
          generation_type: currentView,
          image_count: finalPrompts.length,
          error_code: errorMessage,
        });
        ga4Exception(errorMessage, false);
      }

      const isAuthError =
        errorMessage.includes('403') ||
        errorMessage.includes('unregistered callers') ||
        errorMessage.includes('API_KEY_INVALID') ||
        errorMessage.includes('PERMISSION_DENIED') ||
        errorMessage.includes('identity');

      if (isAuthError) {
        console.log('DEBUG: Auth error detected');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetGenerationWorkspace = useCallback(() => {
    setIsLoading(false);
    setGeneratedImages([]);
  }, []);

  return {
    isLoading,
    generatedImages,
    setGeneratedImages,
    handleGenerateClick,
    resetGenerationWorkspace,
  };
}
