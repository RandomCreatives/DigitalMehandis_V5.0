/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for pdfjs-dist
    config.resolve.alias.canvas = false;

    // Fix for pdfjs-dist worker syntax error in Next.js/SWC
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/pdfjs-dist/,
      type: 'javascript/auto',
    });

    return config;
  },
};

module.exports = nextConfig;
