import Document from '@/components/document';
import Navigation from '@/components/navigation';
import { Converter } from 'showdown';

export default async function ContributeGuide() {
  const url = process.env.NEXT_PUBLIC_HOST;
  const file = await fetch(`${url}/gamulpung-client/guide/en/of_contribute/overview.md`).then(res => res.text());
  const data = new Converter().makeHtml(file);
  const aside = {
    'How to contribute': ['Overview', 'Development', 'Translation', 'Design', 'Testing'],
    Documents: ['Code of Conduct', 'Contributing Guide', 'License'],
  };
  return (
    <>
      <Navigation />
      <Document data={data} aside={aside} />
    </>
  );
}
