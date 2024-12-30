import Image from 'next/image';
import S from './style.module.scss';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className={S.footer}>
      <Link href="/">
        <div>
          <Image src="/icon.png" alt="Gamulpung" width={50} height={50} />
          GAMULPUNG
        </div>
      </Link>
      <Link href="/play">
        <div>PLAY</div>
      </Link>
      <Link href="/documents/contribute-guide">
        <div>CONTRIBUTE</div>
      </Link>
    </footer>
  );
}
