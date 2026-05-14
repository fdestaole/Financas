/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-2": "var(--color-text-2)",
        "text-3": "var(--color-text-3)",
        accent: {
          DEFAULT: "var(--color-accent)",
          2: "var(--color-accent-2)",
          soft: "var(--color-accent-soft)",
        },
        pos: "var(--color-pos)",
        neg: "var(--color-neg)",
        warn: "var(--color-warn)",
        sidebar: "var(--color-sidebar)",
      },
      fontFamily: {
        sans: ['"Inter"', "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
      fontSize: {
        display: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["1.1875rem", { lineHeight: "1.5rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        h2: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["0.8125rem", { lineHeight: "1.125rem" }],
        sm: ["0.75rem", { lineHeight: "1rem" }],
        xs: ["0.6875rem", { lineHeight: "0.875rem" }],
        label: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.06em", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        glow: "var(--shadow-glow)",
        modal: "var(--shadow-modal)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
        "accent-soft-gradient":
          "linear-gradient(180deg, var(--color-accent-soft), transparent)",
      },
    },
  },
  plugins: [],
};
