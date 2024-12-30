import Image from 'next/image';
import S from './style.module.scss';
import Link from 'next/link';

export default function Footer() {
  const host = process.env.NEXT_PUBLIC_HOST;
  return (
    <footer className={S.footer}>
      <Link href="/">
        <div>
          <Image src={host + '/icon.png'} alt="Gamulpung" width={50} height={50} />
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
