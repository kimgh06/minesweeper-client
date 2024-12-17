import Image from 'next/image';
import S from './style.module.scss';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className={S.nav}>
      <div className={`${S.side} ${S.gap}`}>
        <Image src="/gamulpung-client/icon.png" alt="Gamulpung" width={50} height={50} />
        <span>Introduce</span>
        <span>Language</span>
        <span>Github</span>
      </div>
      <div className={S.side}>
        <Link href="/contribute-guide">
          <Image src="/gamulpung-client/contributeButton.svg" alt="Contribute" width={158} height={55} />
        </Link>
        <Link href="/play">
          <Image src="/gamulpung-client/playButton.svg" alt="Play" width={88} height={55} />
        </Link>
      </div>
    </nav>
  );
}
