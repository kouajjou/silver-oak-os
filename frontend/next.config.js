/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Autorise les SVG servis comme images statiques
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Native modules must not be bundled (runs server-side only)
  serverExternalPackages: ['better-sqlite3'],
};

module.exports = nextConfig;
