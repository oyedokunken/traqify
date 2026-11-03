/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "brhnlhvdkmciqncdcovq.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // The app moved from traqify.vercel.app to traqify.oyedokun.dev. Every path on the old host, API calls included,
  // goes permanently to the same path and query on the new one. Only the old host matches, so the new domain, preview
  // deployments and local development are untouched. Keep the destination equal to SITE_URL in lib/site.ts.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "traqify.vercel.app" }],
        destination: "https://traqify.oyedokun.dev/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
