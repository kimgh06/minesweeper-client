'use client';
import Image from 'next/image';
import S from './style.module.scss';
import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <nav className={S.nav} onPointerOver={() => setIsMenuOpen(true)} onPointerLeave={() => setIsMenuOpen(false)}>
      <div className={S.navigation}>
        <div className={`${S.side} ${S.gap}`}>
          <Link href="/">
            <Image src="/gamulpung-client/icon.png" alt="Gamulpung" width={50} height={50} />
          </Link>
          <span>Introduce</span>
          <span>Language</span>
          <Link href="https://github.com/gamultong" prefetch={false}>
            <span>Github</span>
          </Link>
        </div>
        <div className={S.side}>
          <Link href="/documents/contribute-guide">
            <Image src="/gamulpung-client/contributeButton.svg" alt="Contribute" width={158} height={55} />
          </Link>
          <Link href="/play">
            <Image src="/gamulpung-client/playButton.svg" alt="Play" width={88} height={55} />
          </Link>
        </div>
      </div>
      <div>
        {isMenuOpen && (
          <div className={S.menu}>
            <div>
              <Link href="/documents/how-to-play">
                <p>How to play</p>
              </Link>
              <Link href="/documents/contribute-guide">
                <p>Contribute</p>
              </Link>
              <Link href="/documents/release-notes">
                <p>Releases</p>
              </Link>
            </div>
            <div>
              <p>English</p>
              <p>한국어</p>
              <p>日本語</p>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
