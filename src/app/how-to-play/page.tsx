import Document from '@/components/document';
import Navigation from '@/components/navigation';
import { Converter } from 'showdown';
import aside from '../docsPath.json';

export default async function ContributeGuide() {
  const fetchMarkdownFiles = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_HOST;
      const files = ['rules_of_pung'];
      const promises = files.map(file =>
        fetch(`${url}/docs/en/play/${file}.md`).then(res => {
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

  const markdownData = await fetchMarkdownFiles();
  const markdownConverter = new Converter();
  markdownConverter.setOption('tables', true);
  const htmlData = markdownConverter.makeHtml(markdownData);

  return (
    <>
      <Navigation />
      <Document data={htmlData} aside={aside} endpoint="How to Play" />
    </>
  );
}
