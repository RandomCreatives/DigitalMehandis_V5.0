/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for pdfjs-dist
    config.resolve.alias.canvas = false;

    // Ignore pdfjs-dist warnings/errors during build if necessary
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: "javascript/auto",
    });

    return config;
  },
};

module.exports = nextConfig;
