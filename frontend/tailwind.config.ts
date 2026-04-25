import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'so-navy': '#0B1F3A',
        'so-gold': '#C9A961',
        'so-bg': '#071529',
        'so-card': '#0F2744',
        'so-border': '#1E3A5F',
        'so-text': '#E8DCC8',
        'so-muted': '#8BA3C0',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'so-gradient': 'linear-gradient(135deg, #0B1F3A 0%, #071529 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
