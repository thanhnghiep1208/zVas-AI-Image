import React from 'react';
import { isQuotaOrUsageLimitUserMessage } from '../utils/userFacingError';

export interface GenerationErrorAlertProps {
  error: string | null | undefined;
  /** Wrapper classes (e.g. `mt-4`, `text-center`). */
  className?: string;
}

export const GenerationErrorAlert: React.FC<GenerationErrorAlertProps> = ({
  error,
  className = '',
}) => {
  if (!error) return null;

  const isQuota = isQuotaOrUsageLimitUserMessage(error);

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        isQuota
          ? 'border-amber-500/30 bg-amber-500/[0.08] text-amber-200/95'
          : 'border-red-500/25 bg-red-500/[0.08] text-red-300'
      } ${className}`.trim()}
      role="alert"
    >
      {isQuota ? (
        <>
          <span className="font-semibold text-amber-100">Tạm thời bị giới hạn:</span> {error}
        </>
      ) : (
        error
      )}
    </div>
  );
};
