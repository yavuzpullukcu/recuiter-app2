/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Hem canvas'ı hem de bazen canvas ile birlikte sorun çıkaran encoding'i kapatalım
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

module.exports = nextConfig;