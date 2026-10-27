import { Link } from 'react-router-dom';
import { useApp } from '../store/app';
import { useUi } from '../store/ui';
import { useReveal } from '../hooks/useReveal';
import { HeroTree } from '../components/HeroTree';
import * as I from '../components/Icons';

const STEPS = [
  {
    n: 'I',
    title: 'Begin with yourself',
    body: 'Your portrait sits at the heart of the tree. Add your name, a photograph and the year you were born.',
  },
  {
    n: 'II',
    title: 'Summon your relatives',
    body: 'Add parents, partners, siblings and children in a single tap. Relationships name themselves — grandmother, father‑in‑law, great‑grandson.',
  },
  {
    n: 'III',
    title: 'Record their stories',
    body: 'Open the Logbook and give every memory its own page: dates, places, people, photographs and sources.',
  },
];

export function Landing() {
  const user = useApp((s) => s.user);
  const people = useApp((s) => Object.keys(s.history.present.people).length);
  const openAuth = useUi((s) => s.openAuth);
  useReveal();

  const openLabel = user || people > 1 ? 'Open your tree' : 'Begin your tree';

  return (
    <div className="landing">
      <nav className="land-nav" aria-label="Main">
        <Link to="/" className="brand">
          <span className="mark" aria-hidden="true">
            <I.Crest width={38} height={44} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Family Tree</span>
          </span>
        </Link>
        <div className="land-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#logbook">Logbook</a>
        </div>
        {user ? (
          <Link className="btn primary" to="/tree">
            Open your tree
          </Link>
        ) : (
          <button className="btn subtle" onClick={() => openAuth('signin')}>
            Sign in
          </button>
        )}
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">An heirloom for every family</p>
          <h1>
            Chronicle <em>your</em> lineage
          </h1>
          <p className="hero-lead">
            Build a family tree worthy of a royal hall, keep every memory in a bound logbook, and
            pass your history on — beautifully kept, privately held.
          </p>
          <div className="cta-row">
            <Link className="btn primary big" to="/tree">
              {openLabel}
            </Link>
            {!user && (
              <button className="btn subtle big" onClick={() => openAuth('signup')}>
                Create an account
              </button>
            )}
          </div>
          <p className="fine">Free forever · no credit card · works on phone and desktop</p>
        </div>
        <div className="hero-art">
          <HeroTree />
        </div>
        <a href="#how" className="scroll-cue" aria-label="Scroll to learn more">
          <span>Scroll</span>
          <I.Down width={18} height={18} />
        </a>
      </section>

      <section id="how" className="land-section">
        <header className="section-head reveal">
          <p className="eyebrow">How it works</p>
          <h2>Three steps to an heirloom</h2>
          <div className="flourish" aria-hidden="true" />
        </header>
        <div className="steps">
          {STEPS.map((s, i) => (
            <article key={s.n} className="step reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <span className="numeral">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="land-section">
        <header className="section-head reveal">
          <p className="eyebrow">Features</p>
          <h2>Everything a family archive needs</h2>
          <div className="flourish" aria-hidden="true" />
        </header>

        <div className="feature reveal">
          <div className="feature-art art-tree">
            <HeroTree className="small" />
          </div>
          <div className="feature-copy">
            <h3>A tree fit for a royal hall</h3>
            <p>
              Portrait medallions framed in gold, branches traced in filigree. Zoom, pan and fold
              away branches; search anyone in an instant; undo any slip.
            </p>
            <ul className="ticks">
              <li>Guided entry — names, dates, places, occupations and notes</li>
              <li>Relationships named for you, on both sides of the family</li>
              <li>Save as an image, or export GEDCOM for other genealogy software</li>
            </ul>
          </div>
        </div>

        <div id="logbook" className="feature flip reveal">
          <div className="feature-art art-logbook" aria-hidden="true">
            <div className="mock-page">
              <span className="mock-type">Migration · c. 1962</span>
              <span className="mock-title">The voyage to London</span>
              <span className="mock-drop">W</span>
              <span className="mock-line" />
              <span className="mock-line" />
              <span className="mock-line short" />
              <span className="mock-seal" />
            </div>
          </div>
          <div className="feature-copy">
            <h3>The Logbook — a page for every memory</h3>
            <p>
              Open it from the corner of any screen. Each entry is its own manuscript page: a rich
              story, exact or approximate dates, places, the people involved, photographs, scanned
              documents and sources.
            </p>
            <ul className="ticks">
              <li>Link entries to people — they appear on their portrait card</li>
              <li>Search, filter by type or person, and sort by date</li>
              <li>Autosaves as you write; print any page to PDF</li>
            </ul>
          </div>
        </div>

        <div className="feature reveal">
          <div className="feature-art art-timeline" aria-hidden="true">
            {['1932', '1958', '1962', '1990'].map((y, i) => (
              <div key={y} className="mock-tl" style={{ animationDelay: `${i * 0.15}s` }}>
                <b>{y}</b>
                <span />
              </div>
            ))}
          </div>
          <div className="feature-copy">
            <h3>The timeline of your house</h3>
            <p>
              Births, passings and every logbook entry, woven together in order — your family’s
              story read from the first generation to the newest.
            </p>
          </div>
        </div>

        <div className="feature flip reveal">
          <div className="feature-art art-safe" aria-hidden="true">
            <I.Crest width={120} height={138} />
          </div>
          <div className="feature-copy">
            <h3>Yours, and kept safe</h3>
            <p>
              Create an account to keep everything in the cloud and open it on any device. Your data
              is private by default, protected by row‑level security — share a read‑only link only
              when you choose. No account? Your tree stays in this browser.
            </p>
            <ul className="ticks">
              <li>Email or Google sign‑in</li>
              <li>Your guest tree moves into your account on first sign‑in</li>
              <li>Download a full backup at any time</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="quote reveal">
        <blockquote>
          “To forget one’s ancestors is to be a brook without a source, a tree without a root.”
          <cite>— Chinese proverb</cite>
        </blockquote>
      </section>

      <section className="final-cta reveal">
        <h2>Begin your chronicle today</h2>
        <p>It takes a minute to start, and lasts for generations.</p>
        <div className="cta-row center">
          <Link className="btn primary big" to="/tree">
            {openLabel}
          </Link>
          {!user && (
            <button className="btn subtle big" onClick={() => openAuth('signup')}>
              Create an account
            </button>
          )}
        </div>
      </section>

      <footer className="land-foot">
        <span>Family Tree</span>
        <span>React · TypeScript · Vite · Zustand · Supabase · TipTap · Vitest · Playwright</span>
        <a href="https://github.com/arbhadra/famtree">Source on GitHub</a>
      </footer>
    </div>
  );
}
