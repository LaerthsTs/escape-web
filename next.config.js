/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Set by the Next.js security upgrade agent (16.4.0 -> 16.4.5)
    agentUpgrade: 'security',
  },
};

module.exports = nextConfig;
