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
        // The design handoff calls `bg` "ground" and `text` "ink". The keys are
        // kept so screens this stage does not touch keep working; the values
        // are the handoff's.
        imm: {
          bg: '#F4EDF7',            // ground — warmer, slightly deeper than the old #F0EDFF
          'bg-alt': '#F1EAF4',      // optional second ground
          surface: '#FFFFFF',
          'surface-sunk': '#F7F1FA',   // invite-code tiles
          'surface-quiet': '#F2ECF6',  // secondary button
          text: '#2D1B69',          // ink
          muted: '#6A5B94',         // darkened from #7B6BA8 to pass 4.5:1 on ground
          blue: '#74B9FF',          // her colour
          'blue-lift': '#8FC4FF',   // gradient partner
          coral: '#FF6B6B',
          'warm-hi': '#FFD9BC',     // orb highlight
          'warm-mid': '#FFAE8E',
          warm: '#FF8A7B',          // gradient top / spark
          heat: '#F2647A',          // gradient mid / primary button bottom
          'heat-deep': '#D6425F',   // fill bottom / spark
          'ember-text': '#B0566B',  // the only warm colour used for text
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        nunito: ['Nunito_400Regular'],
        'nunito-medium': ['Nunito_500Medium'],
        'nunito-semibold': ['Nunito_600SemiBold'],
        'nunito-bold': ['Nunito_700Bold'],
        'nunito-extrabold': ['Nunito_800ExtraBold'],
        // Names and headlines only — never labels, values, buttons or numbers.
        display: ['Newsreader_400Regular_Italic'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
