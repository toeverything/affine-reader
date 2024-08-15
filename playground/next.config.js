/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcMinify: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
