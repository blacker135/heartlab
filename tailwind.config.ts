import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF7A59',
        background: '#FAF7F2',
        surface: '#FFFFFF',
        accent: '#B8C0FF',
        'text-primary': '#2B2B2B',
        'text-secondary': '#777777',
        expert: {
          evan: '#4A90D9',
          liam: '#5BA88C',
          noah: '#D4A843',
          adrian: '#C45C5C',
        },
      },
      borderRadius: {
        btn: '16px',
        card: '24px',
        input: '18px',
        container: '32px',
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'PingFang SC', 'HarmonyOS Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
