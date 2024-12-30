import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { Suspense } from 'react';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

const host = process.env.NEXT_PUBLIC_HOST;

export const metadata: Metadata = {
  title: 'Gamulpung',
  description: 'Gamulpung, Web Multi-play Infinity Minesweeper Game',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ko_KR',
    url: 'https://gamulpung.vercel.app/',
    siteName: 'Gamulpung',
    images: [
      {
        url: host + '/ogimage.png',
        alt: 'Gamulpung',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="1sW-H9-5GodnFCoN_y-Cbz8mVgWH5zED1nvKVKKtG88" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <Navigation />
          {children}
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
