import Link from 'next/link';
import S from './style.module.scss';
import Image from 'next/image';

export default function Inactive({ time }: { time: number }) {
  return (
    <div className={S.inactive}>
      <div className={S.alert}>
        <p>You`re stunned!</p>
        <p>Try Again After</p>
        <p>
          {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
        </p>
      </div>
      <Link target="_blank" href={'https://forms.gle/Aub94WBWSKrwq9ud6'} className={S.ad}>
        <Image src="/review.png" alt="review" width={300} height={100} />
        기다리는 동안 간단한 설문 참여하기
      </Link>
    </div>
  );
}
