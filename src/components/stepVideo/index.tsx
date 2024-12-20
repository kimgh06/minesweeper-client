import Image from 'next/image';
import S from './style.module.scss';

interface lang {
  [key: string]: string;
}
export default function StepVideo({
  num,
  text,
  source: gif,
  lang,
}: {
  num: number;
  text: lang;
  source: string;
  lang: string;
}) {
  return (
    <div className={S.stepVideo}>
      <div>
        <p>Step {num}</p>
        <p>{text[lang === 'ko' ? 'ko' : 'en']}</p>
      </div>
      <Image src={gif} alt={gif} width={400} height={225} />
    </div>
  );
}
