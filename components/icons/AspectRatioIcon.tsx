import React from 'react';

interface AspectRatioIconProps extends React.SVGProps<SVGSVGElement> {
  ratio: string;
}

export const AspectRatioIcon: React.FC<AspectRatioIconProps> = ({ ratio, ...props }) => {
  let path;
  switch (ratio) {
    case '1:1':
      path = <rect x="4" y="4" width="16" height="16" rx="2" />;
      break;
    case '16:9':
      path = <rect x="2" y="7.5" width="20" height="11.25" rx="2" />;
      break;
    case '9:16':
      path = <rect x="7.5" y="2" width="9" height="20" rx="2" />;
      break;
    case '4:3':
      path = <rect x="3" y="6" width="18" height="13.5" rx="2" />;
      break;
    case '3:4':
      path = <rect x="6" y="3" width="12" height="18" rx="2" />;
      break;
    case '1:4':
      path = <rect x="9.5" y="2" width="5" height="20" rx="1" />;
      break;
    case '1:8':
      path = <rect x="10.5" y="2" width="3" height="20" rx="0.5" />;
      break;
    case '4:1':
      path = <rect x="2" y="9.5" width="20" height="5" rx="1" />;
      break;
    case '8:1':
      path = <rect x="2" y="10.5" width="20" height="3" rx="0.5" />;
      break;
    default:
      path = <rect x="4" y="4" width="16" height="16" rx="2" />;
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      {path}
    </svg>
  );
};