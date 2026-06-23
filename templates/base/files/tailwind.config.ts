// Tailwind клиента: пресет Vitrine маппит классы на CSS-переменные контракта
// токенов (--vt-*). Значения переменных живут в theme/client.css (дизайн-шаг).
import type { Config } from 'tailwindcss';
import { vitrinePreset } from '@vitrine-kit/contracts';

export default {
  presets: [vitrinePreset as Partial<Config>],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
} satisfies Config;
