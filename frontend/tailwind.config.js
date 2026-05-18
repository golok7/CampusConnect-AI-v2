/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Cascadia Code", "monospace"],
      },
      colors: {
        surface: "#111113",
      },
      letterSpacing: {
        widest: "0.15em",
      },
    },
  },
  plugins: [],
  safelist: [
    { pattern: /border-l-(indigo|violet|purple|sky|emerald|blue|orange|rose|teal|amber|lime|yellow|stone|cyan|green|slate|zinc)-(400|500)/ },
    { pattern: /text-(indigo|violet|purple|sky|emerald|blue|orange|rose|teal|amber|lime|yellow|stone|cyan|green|slate|zinc)-(300|400|500)/ },
    { pattern: /bg-(indigo|violet|purple|sky|emerald|blue|orange|rose|teal|amber|lime|yellow|stone|cyan|green|slate|zinc)-500\/10/ },
    { pattern: /border-(indigo|violet|purple|sky|emerald|blue|orange|rose|teal|amber|lime|yellow|stone|cyan|green|slate|zinc)-500\/20/ },
  ],
};
