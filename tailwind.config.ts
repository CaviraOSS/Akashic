import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                mono: ["'Space Mono'", "monospace"],
                sans: ["'Inter'", "system-ui", "sans-serif"],
            },
            colors: {
                ...colors,
                black: "#000000",
                "m3-surface": colors.neutral[950],
                "m3-surface-container": colors.neutral[900],
                "m3-surface-container-high": colors.neutral[800],
                "m3-primary": colors.neutral[200],
                "m3-secondary": colors.neutral[400],
                "m3-on-surface": colors.neutral[100],
                "m3-on-surface-variant": colors.neutral[400],
                "m3-outline": colors.neutral[700],
                "m3-outline-variant": colors.neutral[800],
                "surface-1": colors.neutral[950],
                "surface-2": colors.neutral[900],
                "surface-3": colors.neutral[800],
                "surface-4": colors.neutral[700],
                "border-1": colors.neutral[800],
                "border-2": colors.neutral[800],
                "border-3": colors.neutral[900],
                "text-1": colors.neutral[100],
                "text-2": colors.neutral[300],
                "text-3": colors.neutral[400],
                "text-4": colors.neutral[500],
                blue: colors.blue[400],
                "blue-dim": colors.blue[800],
                "blue-muted": "rgba(255,255,255,0.05)",
                green: colors.emerald[400],
                "green-dim": colors.emerald[800],
                amber: colors.amber[500],
                red: colors.rose[500],
                "red-dim": colors.rose[900],
            },
            borderRadius: {
                panel: "16px",
                card: "12px",
                btn: "9999px",
                tag: "8px",
                pill: "9999px",
            },
            boxShadow: {
                panel: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                "panel-sm": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                blue: "0 0 0 1px rgba(226,232,240,0.4)",
                "inset-top": "inset 0 1px 0 rgba(255,255,255,0.04)",
            },
            animation: {
                "pulse-slow": "pulse-slow 3s ease-in-out infinite",
                "fade-up": "fade-up 0.2s ease-out",
            },
            keyframes: {
                "pulse-slow": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.3" },
                },
                "fade-up": {
                    from: { opacity: "0", transform: "translateY(6px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
