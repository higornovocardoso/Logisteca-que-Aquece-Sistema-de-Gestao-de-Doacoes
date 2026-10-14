/** @type {import('tailwindcss').Config} */
const cor = (variavel) => `rgb(var(--${variavel}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Frio lá fora (névoa e tinta), calor aqui dentro (brasa)
        fundo: cor('fundo'),
        superficie: cor('superficie'),
        linha: cor('linha'),
        texto: cor('texto'),
        suave: cor('suave'),
        tinta: cor('tinta'),
        brasa: { DEFAULT: cor('brasa'), escura: cor('brasa-escura'), clara: cor('brasa-clara') },
        petroleo: { DEFAULT: cor('petroleo'), clara: cor('petroleo-clara') },
        vinho: { DEFAULT: cor('vinho'), clara: cor('vinho-clara') },
        trigo: { DEFAULT: cor('trigo'), clara: cor('trigo-clara') },
      },
      fontSize: {
        rotulo: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      boxShadow: {
        cartao: '0 1px 2px rgb(15 42 51 / 0.04), 0 1px 1px rgb(15 42 51 / 0.03)',
        flutuante: '0 12px 32px -8px rgb(15 42 51 / 0.25), 0 2px 6px rgb(15 42 51 / 0.08)',
      },
      keyframes: {
        crescer: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        surgir: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pulso: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
      },
      animation: {
        crescer: 'crescer 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        surgir: 'surgir 0.35s ease-out both',
        pulso: 'pulso 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
