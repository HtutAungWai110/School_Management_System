import type { NextConfig } from "next";

/** Avatars uploaded from Settings live in the project's own Storage bucket, so
 *  the Supabase host has to be allowed alongside Google avatars.
 *
 *  Protocol and port are derived too, not just the hostname: local dev runs on
 *  http://127.0.0.1:54321, and a hardcoded `https` + empty port can never match
 *  that. next/image rejects the src up front, so the symptom is an "Invalid src
 *  prop" error with no request ever made - which reads like CORS but is not. */
function supabaseStoragePatterns() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }

  const protocol = parsed.protocol.replace(':', '') as 'http' | 'https';
  const port = parsed.port;

  /* `localhost` and `127.0.0.1` are distinct hosts to the matcher, and the dev
   * origin moves between them depending on how the browser is opened. */
  const hostnames =
    parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
      ? ['127.0.0.1', 'localhost']
      : [parsed.hostname];

  return hostnames.map((hostname) => ({
    protocol,
    hostname,
    port,
    pathname: '/storage/v1/object/public/**',
  }));
}

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
      ...supabaseStoragePatterns(),
    ]
  }
};

export default nextConfig;
