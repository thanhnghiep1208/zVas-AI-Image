
import React, { useCallback } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { Dices } from 'lucide-react';
import { generateRandomPrompt } from '../../utils/promptGenerator';

interface PromptManagerProps {
  prompts: string[];
  setPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  hasImage: boolean;
}

export const PromptManager: React.FC<PromptManagerProps> = React.memo(({ prompts, setPrompts, hasImage }) => {
  const addPrompt = useCallback(() => {
    setPrompts((prev) => [...prev, '']);
  }, [setPrompts]);

  const handleRandomPrompt = useCallback(() => {
    const randomText = generateRandomPrompt();
    setPrompts((prev) =>
      prev.length === 1 && prev[0].trim() === '' ? [randomText] : [...prev, randomText]
    );
  }, [setPrompts]);

  const removePrompt = useCallback((index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  }, [setPrompts]);

  const updatePrompt = useCallback((index: number, value: string) => {
    setPrompts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, [setPrompts]);

  const placeholderText = hasImage 
    ? "VD: Biến hậu cảnh thành..."
    : "VD: Một con mèo...";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider">Mô tả (Prompt)</h2>
        <button
          onClick={handleRandomPrompt}
          className="flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all bg-cyan-400/10 px-2 py-1 rounded-md border border-cyan-400/20 hover:border-cyan-400/40"
          title="Tạo prompt ngẫu nhiên"
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Random</span>
        </button>
      </div>
      <div className="space-y-2">
        {prompts.map((prompt, index) => (
          <div key={index} className="relative">
            <textarea
              value={prompt}
              onChange={(e) => updatePrompt(index, e.target.value)}
              placeholder={placeholderText}
              rows={5}
              className="w-full bg-gray-700 border border-gray-600 rounded-md pl-3 pr-9 py-2 text-base focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all resize-none placeholder-gray-500"
            />
            {prompts.length > 1 && (
                <button
                onClick={() => removePrompt(index)}
                className="absolute top-3 right-2 p-1 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Remove prompt"
                >
                <TrashIcon className="w-5 h-5" />
                </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addPrompt}
        className="mt-2 flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
      >
        <PlusIcon className="w-4 h-4 mr-1" />
        <span>Thêm mô tả</span>
      </button>
    </div>
  );
});
