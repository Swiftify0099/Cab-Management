/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFFBEB",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        dark: {
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
        },
      },
    },
  },
  plugins: [],
};
