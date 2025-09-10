/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  output: 'standalone', // Required for AWS Amplify hosting
  images: {
    remotePatterns: [
      // Add specific trusted domains for user avatars
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      }
    ]
  },
  transpilePackages: [
    // UI components that might need transpilation
    '@radix-ui/react-dialog',
    '@radix-ui/react-select',
    '@radix-ui/react-form',
    '@radix-ui/react-slot',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],
  serverExternalPackages: ['mammoth', 'pdf-parse'],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack aliases for AWS Amplify path resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/components/ui': path.resolve(__dirname, 'components/ui'),
    }
    
    return config
  },
};

export default nextConfig;