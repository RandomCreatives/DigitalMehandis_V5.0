/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#1F4E79",
          600: "#1a4268",
          700: "#153557",
        },
      },
    },
  },
  plugins: [],
};
