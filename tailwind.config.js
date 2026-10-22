/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        electric: {
          phase1: '#78350f', // L1 Marrón
          phase2: '#18181b', // L2 Negro
          phase3: '#52525b', // L3 Gris
          neutral: '#2563eb', // N Azul
          earth: '#16a34a', // PE Verde-Amarillo
          pos: '#dc2626', // + Rojo
          neg: '#1e293b', // - Negro/Azul oscuro
          active: '#ef4444', // Activo / Energizado
          activeLight: '#22c55e', // Piloto activo
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
