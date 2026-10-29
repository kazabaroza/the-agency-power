import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: "#14161a",
        paper: "#fbfaf7",
        brand: { DEFAULT: "#d4b06a", dark: "#b8934a", soft: "rgba(212,176,106,0.14)" },
        accent: "#d4b06a",
        forest: { 950: "#061a14", 900: "#0a241c", 800: "#0e2f25", 700: "#14402f", 600: "#1b5240" },
        gold: { DEFAULT: "#d4b06a", light: "#e6cd94", dark: "#b8934a" },
        cream: "#f3eee2",
      },
      fontFamily: { sans: ["Heebo", "Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
