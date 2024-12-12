import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

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
    url: 'https://gamultong.github.io/minesweeper-client/',
    siteName: 'Minesweeper',
    images: [
      {
        url: '/minesweeper-client/icon.png',
        alt: 'Minesweeper',
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
