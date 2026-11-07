/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        matcha: {
          50: "#f1f7ed",
          100: "#e0eed6",
          200: "#c3ddb0",
          300: "#a0c883",
          400: "#7fb25d",
          500: "#5f9941",
          600: "#4a7a32",
          700: "#3c6129",
          800: "#324e24",
          900: "#2b4220",
        },
        cream: {
          50: "#fffdf7",
          100: "#fdf7e8",
          200: "#faecc9",
          300: "#f5dc9c",
        },
        caramel: {
          400: "#c98a4b",
          500: "#b06f33",
          600: "#8f5726",
          700: "#714420",
        },
        peach: {
          100: "#ffe9de",
          200: "#ffd2bb",
          300: "#ffb594",
        },
        blossom: {
          100: "#fde3ec",
          200: "#fbc7db",
          300: "#f6a0c3",
          400: "#ef7aa6",
          500: "#e35589",
          600: "#c2577e",
          700: "#9c4166",
        },
        mint: {
          100: "#dff7ef",
          200: "#b9edd9",
        },
        gold: {
          300: "#f3d98b",
          400: "#e8c158",
          500: "#d4a52f",
        },
      },
      fontFamily: {
        display: ["'Baloo 2'", "'Poppins'", "system-ui", "sans-serif"],
        body: ["'Poppins'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(90, 62, 20, 0.12)",
        lift: "0 14px 40px rgba(90, 62, 20, 0.18)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
