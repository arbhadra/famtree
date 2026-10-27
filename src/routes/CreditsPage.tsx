import { CREDITS } from '../content/credits';
import { AppHeader } from '../components/AppHeader';

export function CreditsPage() {
  return (
    <div className="page">
      <AppHeader />
      <main className="page-main credits">
        <header className="page-head">
          <div>
            <p className="eyebrow">With gratitude</p>
            <h1>Thanks &amp; Credits</h1>
            <p className="lead">
              The research, conversations, standards and open-source work this chronicle is built
              on.
            </p>
          </div>
        </header>
        {CREDITS.map((s) => (
          <section key={s.heading} className="credit-section folio-lite">
            <h2>{s.heading}</h2>
            {s.intro && <p className="credit-intro">{s.intro}</p>}
            <ul>
              {s.items.map((c) => (
                <li key={c.title}>
                  <b>
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        {c.title}
                      </a>
                    ) : (
                      c.title
                    )}
                  </b>
                  {c.by && <span className="by">{c.by}</span>}
                  {c.detail && <span className="detail">{c.detail}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="empty-note center">
          This list is also kept in the repository as <code>credits.txt</code>.
        </p>
      </main>
    </div>
  );
}
