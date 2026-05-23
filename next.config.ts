import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA install fix — when Saitarn installed the PWA on her iPhone she
  // accidentally pinned the ridewise-rcko.vercel.app default URL
  // instead of wynla.app. Safari treats those as different origins, so
  // the manifest's start_url + service-worker scope didn't match the
  // installed PWA's origin — resulting in Safari's URL bar + toolbar
  // staying visible (no fullscreen PWA mode). 308 permanent redirect
  // wynla.app sees the right traffic and PWA installs from the right
  // canonical origin going forward.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ridewise-rcko.vercel.app" }],
        destination: "https://wynla.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
