import Link from 'next/link';
import S from './style.module.scss';
import StepVideo from '@/components/stepVideo';
import Image from 'next/image';
import data from './video.json';

export default function Home({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const lang = searchParams?.lang as string;
  return (
    <div className={S.page}>
      <div className={S.welcome}>
        <h2>Welcome to</h2>
        <h1>GAMULPUNG💣</h1>
        <Link href="/play">
          <button>PLAY</button>
        </Link>
      </div>
      <div className={S.rules}>
        <h1>How to Play</h1>
        {data?.data.map(step => (
          <StepVideo key={step.id} num={step.id} text={step.description} source={step.gif} lang={lang} />
        ))}
      </div>
      <div className={S.contribute}>
        <div className={S.mainBlock}>
          <h1>If you want to Contribute</h1>
          <Link href="/documents/contribute-guide">
            <button>Contribute</button>
          </Link>
        </div>
        <Image src="/gamulpung-client/landingTile.svg" alt="tile" width={400} height={800} />
      </div>
    </div>
  );
}
