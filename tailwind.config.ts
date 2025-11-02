import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "ui-monospace", "monospace"],
      },
      colors: {
        "merse-purple": "#a855f7",
        "merse-pink": "#ec4899",
        "merse-blue": "#38bdf8",
      },
      backgroundImage: {
        "merse-gradient": "linear-gradient(135deg, rgba(168,85,247,0.65), rgba(236,72,153,0.6))",
      },
    },
  },
  plugins: [],
};

export default config;
