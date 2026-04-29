module.exports = {
  darkMode: 'class',
  content: ["./*.html"],
  theme: {
    extend: {
      colors: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        border: 'var(--border-color)',
        'brand-main': 'var(--brand-main)',
        'brand-accent': 'var(--brand-accent)'
      }
    },
  },
  plugins: [],
}
