/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore Sigma.js and related packages during server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('sigma', 'graphology', 'graphology-layout-force');
    }
    return config;
  },
};

export default nextConfig;
