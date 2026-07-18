/** @type {import('tailwindcss').Config} */
// Identidad visual del SENA
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sena: {
          DEFAULT: '#39A900', // Verde institucional
          oscuro: '#007832', // Verde oscuro (hover)
        },
        azul: '#00304D', // Azul oscuro corporativo
        celeste: '#82DEF0', // Azul claro secundario
      },
      fontFamily: {
        sans: ['Work Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
