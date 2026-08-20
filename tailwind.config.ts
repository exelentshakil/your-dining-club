import type { Config } from "tailwindcss";

/**
 * Brand tokens taken from yourdiningclub.com: amber #FDB913 on near-black,
 * a red used only to accent the second half of a headline, cream section
 * backgrounds, pill CTAs and 12px cards.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FDB913",
          50: "#FFF9EA",
          100: "#FFF0C7",
          200: "#FEE28C",
          300: "#FDD256",
          400: "#FDC22F",
          500: "#FDB913",
          600: "#D9970A",
          700: "#A8730B",
          800: "#7A5410",
          900: "#4A3309",
        },
        flame: { DEFAULT: "#E5342A", 600: "#C8281F" },
        ink: {
          DEFAULT: "#0F0F0F",
          black: "#0A0A0A",
          panel: "#141414",
          soft: "#1F2937",
          muted: "#6B7280",
          line: "#E5E7EB",
          wash: "#FAF6EF",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "12px", pill: "50px" },
      boxShadow: {
        pill: "0 4px 15px 0 rgba(0,0,0,0.2)",
        card: "0 1px 2px rgba(15,15,15,0.04), 0 8px 24px -12px rgba(15,15,15,0.15)",
        lift: "0 24px 48px -24px rgba(15,15,15,0.35)",
      },
      maxWidth: { shell: "1180px" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-up": "fade-up 0.5s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
