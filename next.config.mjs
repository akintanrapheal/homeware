import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Response headers.
 *
 * Applied to everything, with the admin locked down harder: a back office that
 * can be framed is a back office that can be clickjacked into approving,
 * deleting or repricing things one invisible click at a time.
 */
const baseSecurityHeaders = [
  // Stop the browser guessing a type and running an uploaded image as script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send the origin to other sites, never the full path or query.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing here needs a camera, a microphone or a wallet.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Two years, so the browser refuses plain HTTP to this host from now on.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to this project. Without it Next walks up the
  // tree, finds an unrelated lockfile in the parent directory, and traces the
  // wrong workspace when bundling for serverless.
  outputFileTracingRoot: projectRoot,

  // The header advertises the exact framework version to anyone scanning.
  poweredByHeader: false,

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...baseSecurityHeaders,
          // The storefront may be embedded by the shop's own pages but not by
          // a third party.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          ...baseSecurityHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          // Never let a proxy or CDN hold a page containing order data.
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          ...baseSecurityHeaders,
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/account/:path*',
        headers: [
          ...baseSecurityHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
