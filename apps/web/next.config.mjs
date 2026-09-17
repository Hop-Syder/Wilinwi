/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les packages partagés sont consommés en TypeScript source.
  transpilePackages: ['@wilinwi/ui', '@wilinwi/offline', '@wilinwi/types'],
  webpack: (config) => {
    // Permet aux imports en `.js` de résoudre les fichiers `.ts`/`.tsx` des packages.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
  async rewrites() {
    return {
      afterFiles: [
        // Redirige les accès directs /:code vers /r/:code si aucune page statique/dynamique n'existe
        {
          source: '/:code([a-zA-Z0-9_-]{5,})',
          destination: '/r/:code',
        },
      ],
    };
  },
};

export default nextConfig;
