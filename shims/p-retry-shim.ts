// @ts-ignore
import pRetryOriginal from '../node_modules/p-retry/index.js';

// Define AbortError locally to ensure it's always available as a named export
export class AbortError extends Error {
  public readonly originalError: Error;
  public override readonly name: 'AbortError' = 'AbortError';
  constructor(message: string | Error) {
    super(message instanceof Error ? message.message : message);
    this.originalError = message instanceof Error ? message : new Error(message);
    if (message instanceof Error && message.stack) {
      this.stack = message.stack;
    }
  }
}

const pRetry = pRetryOriginal.default || pRetryOriginal;

// Attach the local AbortError to the default export as well for compatibility
if (pRetry) {
  pRetry.AbortError = AbortError;
}

export default pRetry;
