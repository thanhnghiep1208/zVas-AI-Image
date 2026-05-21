import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { ImageFile, GeneratedImage, ImageSize } from '../types';
import type { AppView } from '../components/layout/AppHeader';
import type { ProviderKey } from '../constants/aiModels';
import { dataURLtoFile } from '../utils/imageDataUrl';
import { getClosestAspectRatio } from '../utils/aspectRatio';
import { useHistoryImages } from './useHistoryImages';
import { useImageGeneration } from './useImageGeneration';

export type WorkspacePromptOptions = {
  styleSimplified: boolean;
  keepStyle: boolean;
  keepStartImageStyle: boolean;
  forceRemoveBackground: boolean;
  backgroundRemovalStrength: 'soft' | 'strong';
};

const defaultPromptOptions = (): WorkspacePromptOptions => ({
  styleSimplified: false,
  keepStyle: false,
  keepStartImageStyle: false,
  forceRemoveBackground: false,
  backgroundRemovalStrength: 'soft',
});

export interface UseWorkspaceControllerParams {
  user: User | null;
  setError: Dispatch<SetStateAction<string | null>>;
  globalSettings: unknown;
  systemApiKey: string | null;
  getProviderKey: () => ProviderKey;
  getEffectiveModel: () => string;
  isProviderKeyConfigured: (provider: ProviderKey) => boolean;
}

export function useWorkspaceController({
  user,
  setError,
  globalSettings,
  systemApiKey,
  getProviderKey,
  getEffectiveModel,
  isProviderKeyConfigured,
}: UseWorkspaceControllerParams) {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageFile[]>([]);
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null);
  const [isStyleGuideVisible, setIsStyleGuideVisible] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [currentView, setCurrentView] = useState<AppView>('create');
  const [outlineType, setOutlineType] = useState<'none' | 'white' | 'black'>('none');
  const [outlineThickness, setOutlineThickness] = useState<'thin' | 'normal' | 'thick'>('normal');
  const [promptOptions, setPromptOptions] = useState<WorkspacePromptOptions>(defaultPromptOptions);
  const [backgroundStyle, setBackgroundStyle] = useState('none');
  const [workspaceMountKey, setWorkspaceMountKey] = useState(0);

  const { historyImages, setHistoryImages, handleClearHistory } = useHistoryImages(user);

  const {
    isLoading,
    generatedImages,
    setGeneratedImages,
    handleGenerateClick,
    resetGenerationWorkspace,
  } = useImageGeneration({
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
  });

  const clearWorkspaceState = useCallback((opts?: { preserveView?: boolean }) => {
    setImage(null);
    setReferenceImages([]);
    setPrompts(['']);
    setFullscreenImage(null);
    setIsStyleGuideVisible(false);
    setAspectRatio('1:1');
    setImageSize('1K');
    setSelectedStyle('');
    setOutlineType('none');
    setOutlineThickness('normal');
    setPromptOptions(defaultPromptOptions());
    setBackgroundStyle('none');
    if (!opts?.preserveView) {
      setCurrentView('create');
    }
  }, []);

  const handleLogoWorkspaceRefresh = useCallback(() => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    referenceImages.forEach((ref) => URL.revokeObjectURL(ref.previewUrl));
    resetGenerationWorkspace();
    clearWorkspaceState({ preserveView: true });
    setWorkspaceMountKey((k) => k + 1);
  }, [image, referenceImages, resetGenerationWorkspace, clearWorkspaceState]);

  const handleOptionChange = useCallback((option: keyof WorkspacePromptOptions) => {
    setPromptOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  }, []);

  const handleBackgroundRemovalStrengthChange = useCallback((strength: 'soft' | 'strong') => {
    setPromptOptions((prev) => ({ ...prev, backgroundRemovalStrength: strength }));
  }, []);

  const handleImageSelect = useCallback(
    (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return { file, previewUrl };
      });

      const img = new Image();
      img.onload = () => {
        const closest = getClosestAspectRatio(img.naturalWidth, img.naturalHeight);
        setAspectRatio(closest);
      };
      img.src = previewUrl;

      setGeneratedImages([]);
      setError(null);
    },
    [setGeneratedImages, setError]
  );

  const handleImageRemove = useCallback(() => {
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      setImage(null);
    }
    referenceImages.forEach((refImg) => URL.revokeObjectURL(refImg.previewUrl));
    setReferenceImages([]);
    setGeneratedImages([]);
    setError(null);
  }, [image, referenceImages, setGeneratedImages, setError]);

  const handleAddReferenceImage = useCallback((file: File) => {
    setReferenceImages((prev) => [
      ...prev,
      { file, previewUrl: URL.createObjectURL(file) },
    ]);
  }, []);

  const handleRemoveReferenceImage = useCallback((indexToRemove: number) => {
    setReferenceImages((prev) => {
      const imageToRemove = prev[indexToRemove];
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });
  }, []);

  const handleStyleSelectFromGuide = useCallback((styleValue: string) => {
    setSelectedStyle(styleValue);
    setIsStyleGuideVisible(false);
  }, []);

  const handleUseImageAsInput = useCallback(
    async (generatedImage: GeneratedImage) => {
      const newFileName = `generated_${generatedImage.prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 20)}.png`;
      const file = dataURLtoFile(generatedImage.imageUrl, newFileName);

      if (!file) {
        setError('Không dùng được ảnh này làm đầu vào. Thử tải lại hoặc chọn ảnh khác.');
        return;
      }

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      referenceImages.forEach((refImg) => URL.revokeObjectURL(refImg.previewUrl));

      setImage({
        file,
        previewUrl: URL.createObjectURL(file),
      });

      setGeneratedImages([]);
      setReferenceImages([]);
      setError(null);
    },
    [image, referenceImages, setGeneratedImages, setError]
  );

  const activeProvider = getProviderKey();
  const canGenerate =
    prompts.some((p) => p.trim() !== '') &&
    !isLoading &&
    isProviderKeyConfigured(activeProvider);

  return {
    image,
    referenceImages,
    prompts,
    setPrompts,
    fullscreenImage,
    setFullscreenImage,
    isStyleGuideVisible,
    setIsStyleGuideVisible,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
    selectedStyle,
    setSelectedStyle,
    currentView,
    setCurrentView,
    outlineType,
    setOutlineType,
    outlineThickness,
    setOutlineThickness,
    promptOptions,
    backgroundStyle,
    setBackgroundStyle,
    workspaceMountKey,
    historyImages,
    handleClearHistory,
    isLoading,
    generatedImages,
    handleGenerateClick,
    clearWorkspaceState,
    handleLogoWorkspaceRefresh,
    handleOptionChange,
    handleBackgroundRemovalStrengthChange,
    handleImageSelect,
    handleImageRemove,
    handleAddReferenceImage,
    handleRemoveReferenceImage,
    handleStyleSelectFromGuide,
    handleUseImageAsInput,
    canGenerate,
  };
}
