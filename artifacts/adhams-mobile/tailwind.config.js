/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF3C00",
          50: "#FFF0EB",
          100: "#FFD6C7",
          200: "#FFAD8F",
          300: "#FF8457",
          400: "#FF5B1F",
          500: "#FF3C00",
          600: "#CC3000",
          700: "#992400",
          800: "#661800",
          900: "#330C00",
        },
        dark: {
          DEFAULT: "#1a2332",
          50: "#e8eaf0",
          100: "#c5c9d6",
          200: "#9fa5b8",
          300: "#79819a",
          400: "#5d6684",
          500: "#414c6e",
          600: "#374163",
          700: "#2b3453",
          800: "#1f2844",
          900: "#0f1520",
        },
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        background: "#F8F9FA",
        card: "#FFFFFF",
      },
      fontFamily: {
        sans: ["Inter"],
        "sans-medium": ["Inter-Medium"],
        "sans-semibold": ["Inter-SemiBold"],
        "sans-bold": ["Inter-Bold"],
      },
    },
  },
  plugins: [],
};
