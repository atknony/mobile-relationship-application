/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        imm: {
          bg: '#F0EDFF',
          blue: '#74B9FF',
          coral: '#FF6B6B',
          text: '#2D1B69',
          muted: '#7B6BA8',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        nunito: ['Nunito_400Regular'],
        'nunito-medium': ['Nunito_500Medium'],
        'nunito-semibold': ['Nunito_600SemiBold'],
        'nunito-bold': ['Nunito_700Bold'],
        'nunito-extrabold': ['Nunito_800ExtraBold'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
