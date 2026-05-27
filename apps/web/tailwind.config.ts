import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — resolved at runtime via CSS variables
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-sunken": "var(--bg-sunken)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "focus-ring": "var(--focus-ring)",

        // Brand seeds — for one-off use where a specific brand color is required
        "arb-blue": "#0176f8",
        "arb-deep": "#013a87",
        "arb-midnight": "#05163e",
        "arb-cyan": "#14f2fc",
        "arb-white": "#ffffff",

        // Semantic accents — driven by CSS vars (RGB triplets) so they switch
        // with [data-theme] and still support /10, /30 opacity modifiers.
        success: "rgb(var(--color-success) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "glow-cyan": "var(--shadow-glow-cyan)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["18px", "28px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "36px"],
        "4xl": ["36px", "40px"],
        "5xl": ["48px", "52px"],
        "6xl": ["64px", "68px"],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(.22, 1, .36, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "360ms",
      },
    },
  },
  plugins: [],
};

export default config;
