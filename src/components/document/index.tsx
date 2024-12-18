import S from './style.module.scss';

interface AsideType {
  [key: string]: string[];
}

export default function Document({ data, aside }: { data: string; aside: AsideType }) {
  return (
    <div className={S.document}>
      <aside className={S.aside}>
        {aside &&
          Object.keys(aside).map(key => (
            <details key={key}>
              <summary>{key}</summary>
              <ul>
                {aside[key].map(value => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </details>
          ))}
      </aside>
      <main className={S.main} dangerouslySetInnerHTML={{ __html: data }}></main>
    </div>
  );
}
