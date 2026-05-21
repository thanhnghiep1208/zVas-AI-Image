import type { ProviderKey } from '../constants/aiModels';

const ENV_BY_PROVIDER: Record<ProviderKey, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  seedance: 'SEEDANCE_API_KEY',
  seedream: 'SEEDREAM_API_KEY',
};

export function providerKeyMissingMessage(provider: ProviderKey): string {
  const envName = ENV_BY_PROVIDER[provider];
  switch (provider) {
    case 'gemini':
      return `Chưa cấu hình ${envName} trên server. Liên hệ admin hoặc thêm key vào .env.local rồi khởi động lại server.`;
    case 'seedream':
      return `Chưa cấu hình ${envName} trên server (BytePlus ModelArk). Thêm key vào .env.local hoặc Secret Manager, rồi khởi động lại server.`;
    case 'openai':
      return `Chưa cấu hình ${envName} trên server. Liên hệ admin để bật provider OpenAI.`;
    case 'seedance':
      return `Chưa cấu hình ${envName} trên server. Liên hệ admin để bật provider Seedance.`;
    default:
      return `Chưa cấu hình API key cho provider ${provider} trên server.`;
  }
}
