/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D6EAFF', // lighter blue
        secondary: '#F5F0E6', // beige
        accent: '#FF6B6B' // soft coral
      }
    }
  },
  plugins: []
};
