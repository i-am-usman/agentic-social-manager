/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: "#4f46e5",
          purple: "#9333ea",
          ink: "#1e293b",
        },
      },
    },
  },
  plugins: [],
}