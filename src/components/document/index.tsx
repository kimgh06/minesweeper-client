import Link from 'next/link';
import S from './style.module.scss';
import aside from './docsPath.json';

export default function Document({ endpoint, data, lang }: { endpoint: string; data: string; lang: string }) {
  const url = process.env.NEXT_PUBLIC_HOST;

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
      <main className={S.main} dangerouslySetInnerHTML={{ __html: data }} />
    </div>
  );
}
