import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e3f2f8",
          100: "#b9ddf0",
          200: "#8bc7e7",
          300: "#5cb1de",
          400: "#38a1d4",
          500: "#1778bd",
          600: "#146da9",
          700: "#105e93",
          800: "#00546f",
          900: "#003a4f",
          950: "#002233",
        },
      },
    },
  },
  safelist: [
    { pattern: /^(bg|text|border|ring)-(brand)-(50|100|200|300|400|500|600|700|800|900|950)$/, variants: ["hover", "focus"] },
  ],
  plugins: [],
};
export default config;
