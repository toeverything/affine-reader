/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    externalMiddlewareRewritesResolve: ['undici']
  },
}

module.exports = nextConfig
