import Document from '@/components/document';
import { Converter } from 'showdown';

export default async function ContributeGuide() {
  const fetchMarkdownFiles = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_HOST;
      const files = ['overview', 'about_dashboard', 'about_interactions', 'how_to_render', 'kinds_of_websocket_events'];
      const promises = files.map(file =>
        fetch(`${url}/docs/en/of_contribute/${file}.md`).then(res => {
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
      <Document data={htmlData} endpoint="Contribute Guide" />
    </>
  );
}
