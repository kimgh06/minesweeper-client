import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

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
        url: '/gamulpung-client/ogimage.png',
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
        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  );
}
