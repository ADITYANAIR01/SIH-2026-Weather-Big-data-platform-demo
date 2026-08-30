import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A232E",
        inksoft: "#3C4754",
        paper: "#F7F4EE",
        paperdeep: "#EFEAE0",
        card: "#FFFFFF",
        line: "#E4DED0",
        cobalt: {
          DEFAULT: "#2563EB",
          50: "#EEF4FF",
          100: "#DBE8FF",
          400: "#5E8AEF",
          600: "#1D4ED8",
          700: "#1B3FAA",
        },
        saffron: "#E8622C",
        "saffron-deep": "#C2410C",
        green: "#1E9E67",
        "green-deep": "#147A50",
        bay: "#0E7FB0",
        "bay-deep": "#0C6E99",
        "frost": "#3E7FA8",
        "frost-deep": "#2C5F83",
        sand: "#C05621",
        "sand-deep": "#97451A",
        earth: "#8A6B46",
        "earth-deep": "#6E4E2E",
        olive: "#C2A010",
        "olive-deep": "#8F7A0C",
        "dune-deep": "#8B6524",
        "velvet-deep": "#4538B5",
        "mists-deep": "#5D6B78",
        hazard: "#D92D20",
        ice: "#59A6C8",
        mists: "#7B8794",
        dune: "#B78A3F",
        velvet: "#5A4BD1",
        muted: "#667085",
        "muted-strong": "#475467",
      },
      fontFamily: {
        serif: ['Georgia', '"Noto Serif Devanagari"', "Cambria", "Times New Roman", "serif"],
        sans: ['Inter', '"Noto Sans Devanagari"', "Segoe UI", "system-ui", "sans-serif"],
        mono: ['"Roboto Mono"', '"Cascadia Code"', "Consolas", "monospace"],
      },
      boxShadow: {
        lift: "0 1px 2px rgba(26,35,46,0.06), 0 8px 24px -8px rgba(26,35,46,0.18)",
        soft: "0 1px 3px rgba(26,35,46,0.10)",
        hover: "0 2px 4px rgba(26,35,46,0.08), 0 14px 32px -12px rgba(26,35,46,0.22)",
        map: "0 0 0 1px rgba(26,35,46,0.08), 0 24px 64px -20px rgba(26,35,46,0.4)",
      },
      animation: {
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
        "ticker-in": "tickerIn 0.55s ease-out",
        "card-in": "cardIn 0.4s ease-out",
        "fade-in": "fadeIn 0.6s ease-out",
        "fade-slide": "fadeSlide 0.35s ease-out",
        "pin-pop": "pinPop 0.35s ease-out",
        "skeleton-shimmer": "skeletonShimmer 1.4s ease-in-out infinite",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.82)" },
        },
        tickerIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cardIn: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeSlide: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pinPop: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        skeletonShimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;