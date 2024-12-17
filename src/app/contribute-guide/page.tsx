import Navigation from '@/components/navigation';
import { Converter } from 'showdown';
import S from './style.module.scss';

export default async function ContributeGuide() {
  const url = process.env.NEXT_PUBLIC_HOST;
  const file = await fetch(`${url}/gamulpung-client/guide/en/of_contribute/overview.md`).then(res => res.text());
  const data = new Converter().makeHtml(file);
  return (
    <div className={S.guide}>
      <Navigation />
      <main className={S.main}>
        <aside>Aside</aside>
        <div dangerouslySetInnerHTML={{ __html: data }} />
      </main>
    </div>
  );
}
