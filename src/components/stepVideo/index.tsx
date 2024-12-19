import Image from 'next/image';
import S from './style.module.scss';

export default function StepVideo({ num, text, source: gif }: { num: number; text: string; source: string }) {
  return (
    <div className={S.stepVideo}>
      <div>
        <p>Step {num}</p>
        <p>{text}</p>
      </div>
      <Image src={gif} alt={text} width={400} height={225} />
    </div>
  );
}
