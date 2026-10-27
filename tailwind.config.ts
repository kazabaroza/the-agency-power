import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: "#14161a",
        paper: "#fbfaf7",
        brand: { DEFAULT: "#5b3df5", dark: "#4128c9", soft: "#efeaff" },
        accent: "#ff7a45",
      },
      fontFamily: { sans: ["Heebo", "Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
