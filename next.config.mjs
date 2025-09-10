/** @type {import('next').NextConfig} */

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
  serverExternalPackages: ['mammoth', 'pdf-parse', '@aws-sdk/client-rds-data'],
};

export default nextConfig;