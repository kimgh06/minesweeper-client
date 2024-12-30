'use client';
import Image from 'next/image';
import S from './style.module.scss';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') || 'en';
  return (
    <nav className={S.nav} onPointerOver={() => setIsMenuOpen(true)} onPointerLeave={() => setIsMenuOpen(false)}>
      <div className={S.navigation}>
        <div className={`${S.side} ${S.gap}`}>
          <Link href={`/?lang=${lang}`}>
            <Image src="/icon.png" alt="Gamulpung" width={50} height={50} />
          </Link>
          <span>Introduce</span>
          <span>Language</span>
          <Link href="https://github.com/gamultong" prefetch={false}>
            <span>Github</span>
          </Link>
        </div>
        <div className={S.side}>
          <Link href={`/documents/contribute-guide?lang=${lang}`}>
            <Image src="/contributeButton.svg" alt="Contribute" width={158} height={55} />
          </Link>
          <Link href="/play">
            <Image src="/playbutton.svg" alt="Play" width={88} height={55} />
          </Link>
        </div>
      </div>
      <div>
        {isMenuOpen && (
          <div className={S.menu}>
            <div>
              <Link href={`/documents/how-to-play?lang=${lang}`}>
                <p>How to play</p>
              </Link>
              <Link href={`/documents/contribute-guide?lang=${lang}`}>
                <p>Contribute</p>
              </Link>
              <Link href={`/documents/release-notes?lang=${lang}`}>
                <p>Releases</p>
              </Link>
            </div>
            <div>
              <Link href="?">
                <p>English</p>
              </Link>
              <Link href="?lang=ko">
                <p>한국어</p>
              </Link>
              {/* <Link href="?lang=ja">
                <p>日本語</p>
              </Link> */}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
