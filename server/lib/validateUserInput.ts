const MAX_PROMPT_LENGTH = 4000;
const MIN_PASSWORD_LENGTH = 12;

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  return { valid: true };
}

export function validatePrompt(raw: string): { valid: boolean; error?: string } {
  const prompt = raw.trim();
  if (!prompt) {
    return { valid: false, error: 'Prompt is required.' };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt quá dài (tối đa ${MAX_PROMPT_LENGTH} ký tự).` };
  }
  return { valid: true };
}
