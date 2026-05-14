import React, { ErrorInfo, ReactNode } from 'react';
import { describeErrorBoundaryUserMessage } from '../utils/userFacingError';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = describeErrorBoundaryUserMessage(this.state.error);

      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--lp-void)] p-4 text-[var(--lp-text)]">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[var(--lp-surface-elevated)] p-8 text-center shadow-2xl backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-display mb-4 text-2xl font-bold text-[var(--lp-text)]">Rất tiếc!</h2>
            <p className="mb-8 text-[var(--lp-muted)]">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-red-600 py-3 font-bold text-white transition-all hover:bg-red-500"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
