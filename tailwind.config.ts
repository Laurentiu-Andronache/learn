import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        sm: ["var(--text-sm, 0.875rem)", { lineHeight: "1.43" }],
      },
      fontFamily: {
        display: ["var(--font-body)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        flashcard: {
          accent: "hsl(var(--flashcard-accent))",
        },
        quiz: {
          accent: "hsl(var(--quiz-accent))",
        },
        reading: {
          accent: "hsl(var(--reading-accent))",
        },
        rating: {
          again: "hsl(var(--rating-again))",
          hard: "hsl(var(--rating-hard))",
          good: "hsl(var(--rating-good))",
          easy: "hsl(var(--rating-easy))",
        },
        progress: {
          mastered: "hsl(var(--progress-mastered))",
          review: "hsl(var(--progress-review))",
          learning: "hsl(var(--progress-learning))",
          new: "hsl(var(--progress-new))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "glow-sm": "0 0 10px -3px hsl(var(--primary) / 0.3)",
        glow: "0 0 20px -5px hsl(var(--primary) / 0.35)",
        "glow-lg": "0 0 30px -5px hsl(var(--primary) / 0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px -3px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 20px -3px hsl(var(--primary) / 0.5)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-3px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(3px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "tts-pulse": {
          "0%, 100%": { backgroundColor: "hsl(var(--primary) / 0.06)" },
          "50%": { backgroundColor: "hsl(var(--primary) / 0.14)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        shake: "shake 0.5s ease-in-out",
        shimmer: "shimmer 2s linear infinite",
        "tts-pulse": "tts-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
