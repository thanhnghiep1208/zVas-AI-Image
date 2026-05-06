
import React, { useEffect } from 'react';

interface StyleGuideViewerProps {
  onClose: () => void;
  onStyleSelect: (styleValue: string) => void;
}

const STYLE_GUIDE_IMAGE_URL = 'https://thanhnghiep.top/CVMatcher/styleai.jpg';

/**
 * Configuration for the 6-column grid layout of the 23 styles.
 * Normalized to 1000px width base for percentage calculation.
 */
const IMAGE_WIDTH_PX = 1568; 
const IMAGE_HEIGHT_PX = 1300; // Adjusted for new aspect ratio

// Dimensions as requested: 155x144 for each box
const HOTSPOT_WIDTH_PX = 230; 
const HOTSPOT_HEIGHT_PX = 276;
const SPACING_X_PX = 25; 
const SPACING_Y_PX = 40;

const START_X_PX = 36; 
const START_Y_PX = 40; 

const styleHotspots: { name: string; category: string; value: string; coords: { x: number; y: number; width: number; height: number; } }[] = [];

// The 23 specific styles provided by the user
const activeStyles = [
  'Photorealistic', 'Modern Brutalist', 'Geometric 3D', 'Surrealism', 'Whimsical 3D', 'Neon Art',
  'Cyberpunk', 'Cinematic', 'Anime', 'Flat Design', 'Isometric 3D', 'Retro Print',
  'Synthwave', 'Pixel Art', 'Sketch', 'Diorama', 'Low Poly', 'Doodle',
  '3D Pixel', 'Manga Ink', 'Watercolor', 'Oil Painting', 'Scribble Sketch'
];

const styleCategories: Record<string, string> = {
  'Anime': 'Illustration',
  'Watercolor': 'Illustration',
  'Oil Painting': 'Illustration',
  'Sketch': 'Illustration',
  'Doodle': 'Illustration',
  'Manga Ink': 'Illustration',
  'Scribble Sketch': 'Illustration',
  'Flat Design': 'Vector art',
  'Isometric 3D': 'Vector art',
  'Low Poly': 'Vector art',
  'Geometric 3D': '3D',
  'Whimsical 3D': '3D',
  '3D Pixel': '3D',
  'Diorama': '3D',
};

activeStyles.forEach((name, index) => {
    const row = Math.floor(index / 6); // Changed to 6 columns
    const col = index % 6;
    
    const x_px = START_X_PX + col * (HOTSPOT_WIDTH_PX + SPACING_X_PX);
    const y_px = START_Y_PX + row * (HOTSPOT_HEIGHT_PX + SPACING_Y_PX);
    
    const category = styleCategories[name] || 'Style';
    
    styleHotspots.push({
        name: name,
        category: category,
        value: `${category}:${name}`,
        coords: {
            x: (x_px / IMAGE_WIDTH_PX) * 100,
            y: (y_px / IMAGE_HEIGHT_PX) * 100,
            width: (HOTSPOT_WIDTH_PX / IMAGE_WIDTH_PX) * 100,
            height: (HOTSPOT_HEIGHT_PX / IMAGE_HEIGHT_PX) * 100,
        }
    });
});

export const StyleGuideViewer: React.FC<StyleGuideViewerProps> = ({ onClose, onStyleSelect }) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-guide-title"
    >
      <div
        className="relative bg-gray-900 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
            <div>
                <h2 id="style-guide-title" className="text-xl font-bold text-white tracking-tight">
                    Thư viện Phong cách <span className="text-cyan-400 font-mono text-sm ml-2">23 Mẫu • Lưới 6 Cột</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Click vào hình thu nhỏ để áp dụng vào Prompt</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-red-500/20 border border-gray-700 transition-all shadow-lg"
              aria-label="Đóng"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        {/* Image Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-950 flex justify-center custom-scrollbar">
          <div className="relative inline-block w-full max-w-4xl h-fit">
            <img
              src={STYLE_GUIDE_IMAGE_URL}
              alt="Style guide grid"
              className="block w-full h-auto shadow-2xl rounded-lg border border-gray-800"
            />
            {styleHotspots.map(hotspot => (
                <div
                    key={hotspot.value}
                    title={hotspot.name}
                    aria-label={`Chọn style: ${hotspot.name}`}
                    className="absolute group"
                    style={{
                        left: `${hotspot.coords.x}%`,
                        top: `${hotspot.coords.y}%`,
                        width: `${hotspot.coords.width}%`,
                        height: `${hotspot.coords.height}%`,
                        cursor: 'pointer'
                    }}
                    onClick={() => onStyleSelect(hotspot.value)}
                >
                    {/* Visual selection box */}
                    <div className="w-full h-full bg-cyan-400/0 border-2 border-transparent group-hover:border-cyan-400 group-hover:bg-cyan-400/10 rounded-lg transition-all duration-150 shadow-lg group-hover:shadow-cyan-500/20"></div>
                    
                    {/* Mini Indicator */}
                    <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-cyan-500/0 group-hover:bg-cyan-500 transition-colors shadow-sm"></div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase whitespace-nowrap z-20 shadow-xl">
                        {hotspot.category}: {hotspot.name}
                    </div>
                </div>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  );
};
