import Link from 'next/link';
import S from './style.module.scss';

interface AsideType {
  [key: string]: { [key: string]: string };
}

export default function Document({ endpoint, data, aside }: { endpoint: string; data: string; aside: AsideType }) {
  const url = process.env.NEXT_PUBLIC_HOST;
  return (
    <div className={S.document}>
      <aside className={S.aside}>
        {aside &&
          Object.keys(aside).map(key => (
            <details key={key} open={endpoint === key}>
              <summary>{key}</summary>
              <ul>
                {Object.entries(aside[key]).map(([value, href]) => (
                  <Link href={`${url}/${key.replaceAll(/ /g, '-').toLowerCase()}${href}`} key={value}>
                    <li>{value}</li>
                  </Link>
                ))}
              </ul>
            </details>
          ))}
      </aside>
      <main className={S.main} dangerouslySetInnerHTML={{ __html: data }}></main>
    </div>
  );
}
