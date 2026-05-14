/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9f3",
          100: "#d4f0e1",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
        },
      },
    },
  },
  plugins: [],
};
