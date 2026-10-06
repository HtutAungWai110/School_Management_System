import type { NextConfig } from "next";

/** Avatars uploaded from Settings live in the project's own Storage bucket, so
 *  the Supabase host has to be allowed alongside Google avatars. Derived from
 *  the env var rather than hardcoded, and skipped when it is absent. */
const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      ...(supabaseHostname
        ? [{
            protocol: 'https' as const,
            hostname: supabaseHostname,
            port: '',
            pathname: '/storage/v1/object/public/**',
          }]
        : []),
    ]
  }
};

export default nextConfig;
