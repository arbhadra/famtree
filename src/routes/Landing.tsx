import { Link } from 'react-router-dom';
import { useApp } from '../store/app';
import { useUi } from '../store/ui';
import { useReveal } from '../hooks/useReveal';
import { HeroTree } from '../components/HeroTree';
import { AvatarBody } from '../components/Avatar';
import type { LifeStage } from '../model/age';
import type { Gender } from '../model/types';
import * as I from '../components/Icons';

/** Illustration: one person with an ex-wife and a wife, and children grouped under each couple. */
function BlendedArt() {
  const people: { x: number; y: number; stage: LifeStage; g: Gender; ring: string }[] = [
    { x: 80, y: 80, stage: 'adult', g: 'female', ring: '#8d8577' },
    { x: 210, y: 80, stage: 'adult', g: 'male', ring: '#e3c470' },
    { x: 340, y: 80, stage: 'adult', g: 'female', ring: '#c7607c' },
    { x: 145, y: 232, stage: 'teen', g: 'male', ring: '#e3c470' },
    { x: 275, y: 232, stage: 'child', g: 'female', ring: '#e3c470' },
    { x: 375, y: 232, stage: 'baby', g: 'male', ring: '#e3c470' },
  ];
  const r = 34;
  return (
    <svg viewBox="0 0 440 290" className="blended-art">
      <path d="M118 80 H172" stroke="#a08690" strokeWidth="2.2" strokeDasharray="8 6" fill="none" />
      <path d="M248 80 H302" stroke="#c7607c" strokeWidth="2.2" fill="none" />
      <path d="M145 80 V160 M145 160 V198" stroke="#d8b765" strokeWidth="2" fill="none" />
      <path
        d="M275 80 V160 M275 160 H375 M275 160 V198"
        stroke="#d8b765"
        strokeWidth="2"
        fill="none"
      />
      <path d="M375 160 V198" stroke="#d8b765" strokeWidth="2" strokeDasharray="7 5" fill="none" />
      <path d="M145 86 c-6-5-9-9-5-13 3-3 5-1 5 1 0-2 2-4 5-1 4 4 1 8-5 13z" fill="#8f7780" />
      <path d="M145.5 73 l-2.5 5 3.5 2.5 -2 5" stroke="#0b1530" strokeWidth="1.4" fill="none" />
      <path d="M275 86 c-6-5-9-9-5-13 3-3 5-1 5 1 0-2 2-4 5-1 4 4 1 8-5 13z" fill="#c7607c" />
      {people.map((p, i) => (
        <g key={i}>
          <clipPath id={`bl-${i}`}>
            <circle cx={p.x} cy={p.y} r={r} />
          </clipPath>
          <circle cx={p.x} cy={p.y} r={r + 4} fill={p.ring} />
          <circle cx={p.x} cy={p.y} r={r + 1.5} fill="#0b1530" />
          <circle cx={p.x} cy={p.y} r={r} fill="#f1e5c4" />
          <g clipPath={`url(#bl-${i})`} opacity={i === 0 ? 0.75 : 1}>
            <svg x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} viewBox="0 0 100 100">
              <AvatarBody stage={p.stage} gender={p.g} />
            </svg>
          </g>
        </g>
      ))}
      <text x="80" y="140" textAnchor="middle" className="ba-l">
        Ex-wife
      </text>
      <text x="340" y="140" textAnchor="middle" className="ba-l">
        Wife
      </text>
      <text x="145" y="288" textAnchor="middle" className="ba-l">
        Son
      </text>
      <text x="275" y="288" textAnchor="middle" className="ba-l">
        Half-sister
      </text>
      <text x="375" y="288" textAnchor="middle" className="ba-l">
        Adopted
      </text>
    </svg>
  );
}

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
              <li>Hand-drawn portraits for everyone until you add a photo, by age and gender</li>
              <li>Save as an image, or export GEDCOM for other genealogy software</li>
            </ul>
          </div>
        </div>

        <div id="complex" className="feature flip reveal">
          <div className="feature-art art-blended" aria-hidden="true">
            <BlendedArt />
          </div>
          <div className="feature-copy">
            <h3>Built for real, complex families</h3>
            <p>
              Second marriages, divorces, half-siblings, adoptions and step-grandparents all belong
              on the map. Everyone you add appears on one family map — nobody is hidden for being
              “too far away” or not related by blood.
            </p>
            <ul className="ticks">
              <li>Several partners each, with married, divorced, separated or widowed status</li>
              <li>
                Add children with a specific partner; half-siblings group under the right couple
              </li>
              <li>Birth, adoptive, step, foster and guardian links, each drawn differently</li>
              <li>
                Relationships worked out for you — stepmother, half-brother, great-aunt, second
                cousin once removed
              </li>
              <li>
                Show everyone, only blood relatives, or just your direct line — then fit it all on
                screen
              </li>
            </ul>
          </div>
        </div>

        <div id="logbook" className="feature reveal">
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

        <div className="feature flip reveal">
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
              Births, marriages, passings and every logbook entry, woven together in order — your
              family’s story read from the first generation to the newest.
            </p>
          </div>
        </div>

        <div className="feature reveal">
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
