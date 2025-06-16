import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Add @opentelemetry/instrumentation to externals
    // This helps resolve "Critical dependency: the request of a dependency is an expression" errors during build
    // related to packages like Genkit that use OpenTelemetry.
    config.externals = [...(config.externals || []), '@opentelemetry/instrumentation'];
    
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
