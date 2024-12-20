'use client';
import Link from 'next/link';
import S from './style.module.scss';
import aside from './docsPath.json';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Converter } from 'showdown';

export default function Document({ endpoint, files }: { endpoint: string; files: string[] }) {
  const url = process.env.NEXT_PUBLIC_HOST;
  const params = useSearchParams();
  const lang = params.get('lang') || 'en';
  const [htmlData, setHtmlData] = useState<string>('');

  const fetchMarkdownFiles = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_HOST;
      const promises = files.map(file =>
        fetch(`${url}/docs/${lang}/of_contribute/${file}.md`).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${file}`);
          return res.text();
        }),
      );
      const values = await Promise.all(promises);

      const markdownData = values.join('\n');
      const markdownConverter = new Converter();
      markdownConverter.setOption('tables', true);
      const htmlData = markdownConverter.makeHtml(markdownData);
      setHtmlData(htmlData);
    } catch (error) {
      console.error('Error fetching markdown files:', error);
      return '';
    }
  };

  useEffect(() => {
    fetchMarkdownFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={S.document}>
      <aside className={S.aside}>
        {aside &&
          Object.keys(aside).map(key => (
            <details key={key} open={endpoint === key}>
              <summary>{key}</summary>
              <ul>
                {Object.entries(aside[key as keyof typeof aside]).map(([value, href]) => (
                  <Link
                    href={`${url}/documents/${key.replaceAll(/ /g, '-').toLowerCase()}?lang=${lang}${href}`}
                    key={value}
                  >
                    <li>{value}</li>
                  </Link>
                ))}
              </ul>
            </details>
          ))}
      </aside>
      <main className={S.main} dangerouslySetInnerHTML={{ __html: htmlData }} />
    </div>
  );
}
