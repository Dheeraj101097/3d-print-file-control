/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        /* ── Semantic theme tokens ─────────────────────────────
           All values resolve to CSS variables in index.css.
           To change the whole theme: edit :root in index.css.
           ─────────────────────────────────────────────────── */
        theme: {
          bg:              'var(--color-bg-global)',
          surface:         'var(--color-surface-high)',
          'surface-mid':   'var(--color-surface-mid)',
          'surface-low':   'var(--color-surface-low)',
          text:            'var(--color-text-primary)',
          'text-secondary':'var(--color-text-secondary)',
          'text-muted':    'var(--color-text-muted)',
          action:          'var(--color-action-primary)',
          hover:           'var(--color-action-hover)',
          border:          'var(--color-border)',
          'border-soft':   'var(--color-border-soft)',
        },
        /* ── Raw palette (use sparingly — prefer semantic tokens) */
        brand: {
          deepest:  '#0B2545',   /* Space Cadet */
          dark:     '#13315C',   /* Oxford Blue */
          primary:  '#134074',   /* Yale Blue */
          carolina: '#8DA9C4',   /* Carolina Blue */
          mint:     '#EEF4ED',   /* Mint Cream */
          surface:  '#f5fbf4',   /* Stitch surface */
        }
      },
      borderRadius: {
        'xl2': '12px',
        'xl3': '16px',
        'xl4': '20px',
      },
      boxShadow: {
        'ambient': '0px 12px 32px rgba(11, 37, 69, 0.35)',
        'card':    '0px 4px 16px rgba(11, 37, 69, 0.25)',
        'modal':   '0px 20px 60px rgba(11, 37, 69, 0.55)',
        'card-light': '0px 4px 16px rgba(11, 37, 69, 0.05)',
        'modal-light': '0px 20px 60px rgba(11, 37, 69, 0.12)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      letterSpacing: {
        'technical': '0.08em',
      },
    },
  },
  plugins: [],
};
