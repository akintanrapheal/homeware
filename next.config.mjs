import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to this project. Without it Next walks up the
  // tree, finds an unrelated lockfile in the parent directory, and traces the
  // wrong workspace when bundling for serverless.
  outputFileTracingRoot: projectRoot,

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
