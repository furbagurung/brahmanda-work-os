/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        line: 'var(--color-border)',
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        muted: 'var(--color-muted)',
        brand: 'var(--color-primary)',
        blue: 'var(--color-primary)',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24, 24, 27, 0.035)',
        panel: 'var(--shadow-panel)',
      },
    },
  },
  plugins: [],
}
