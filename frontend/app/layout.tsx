import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Silver Oak OS',
  description: 'Virtual Staff Interface — Silver Oak',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Silver Oak OS',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale removed (a11y violation - blocks zoom for visually impaired)
  // userScalable removed (a11y violation - blocks zoom for visually impaired)
  viewportFit: 'cover',
  themeColor: '#071529',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="bg-so-bg text-so-text min-h-screen">{children}</body>
    </html>
  );
}
