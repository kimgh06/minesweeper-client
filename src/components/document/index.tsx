import Link from 'next/link';
import S from './style.module.scss';

interface AsideType {
  [key: string]: { [key: string]: string };
}

export default function Document({ data, aside }: { data: string; aside: AsideType }) {
  return (
    <div className={S.document}>
      <aside className={S.aside}>
        {aside &&
          Object.keys(aside).map(key => (
            <details key={key} open>
              <summary>{key}</summary>
              <ul>
                {Object.entries(aside[key]).map(([value, href]) => (
                  <Link href={href} key={value}>
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
