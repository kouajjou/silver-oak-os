/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Autorise les SVG servis comme images statiques
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
