// The client's Tailwind: the Vitrine preset maps classes to the token contract's
// CSS variables (--vt-*). The variable values live in theme/client.css (design step).
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
