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
  title: 'Minesweeper',
  description: 'A simple Minesweeper game',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gamultong.github.io/gamulpung-client/',
    siteName: 'Minesweeper',
    images: [
      {
        url: host + '/gamulpung-client/ogimage.png',
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
