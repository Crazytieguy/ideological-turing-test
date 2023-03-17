module.exports = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      cyan: '#30ffef',
    },
    extend: {
      fontFamily: {
        sans: ['Shaked', 'Indie Flower', 'sans-serif'],
      },
    },
  },
  daisyui: {
    styled: true,
    themes: false,
    base: true,
    utils: true,
    logs: true,
    rtl: false,
    prefix: '',
    darkTheme: 'dark',
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};
