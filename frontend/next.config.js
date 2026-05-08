/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for pdfjs-dist
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
