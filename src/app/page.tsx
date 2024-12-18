import Link from 'next/link';
import S from './style.module.scss';
import Navigation from '@/components/navigation';

export default function Home() {
  return (
    <div className={S.page}>
      <Navigation />
      <div className={S.welcome}>
        <h2>Welcome to</h2>
        <h1>GAMULPUNG💣</h1>
        <Link href="/play">
          <button>PLAY</button>
        </Link>
      </div>
    </div>
  );
}
