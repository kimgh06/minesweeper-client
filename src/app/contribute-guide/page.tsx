import Document from '@/components/document';
import Navigation from '@/components/navigation';
import { Converter } from 'showdown';
import aside from './aside.json';

export default async function ContributeGuide() {
  const fetchMarkdownFiles = async (files: string[]) => {
    try {
      const url = process.env.NEXT_PUBLIC_HOST;
      const promises = files.map(file =>
        fetch(`${url}/gamulpung-client/guide/en/of_contribute/${file}.md`).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${file}`);
          return res.text();
        }),
      );
      const values = await Promise.all(promises);
      return values.join('\n');
    } catch (error) {
      console.error('Error fetching markdown files:', error);
      return '';
    }
  };
  const files = ['overview', 'about_dashboard', 'about_interactions', 'how_to_render', 'kinds_of_websocket_events'];

  // Markdown 파일 가져오기 및 HTML 변환
  const markdownData = await fetchMarkdownFiles(files);
  const htmlData = new Converter().makeHtml(markdownData);

  return (
    <>
      <Navigation />
      <Document data={htmlData} aside={aside} />
    </>
  );
}
