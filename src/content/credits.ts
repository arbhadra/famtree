/* Everything this project drew on. Rendered at /credits and mirrored in credits.txt. */

export interface Credit {
  title: string;
  by?: string;
  detail?: string;
  url?: string;
}

export interface CreditSection {
  heading: string;
  intro?: string;
  items: Credit[];
}

export const CREDITS: CreditSection[] = [
  {
    heading: 'Research & inspiration',
    intro:
      'Writing and conversations that shaped which charts exist and how complex families are handled.',
    items: [
      {
        title: 'Types of Family Trees – A Guide to Family Charts and Templates',
        by: 'Yashodhara Keerthisena, Creately (updated 16 October 2026)',
        detail:
          'The basis for the chart views: traditional/ancestral, descendant, vertical, horizontal, fan and extended family trees.',
        url: 'https://creately.com',
      },
      {
        title: 'Drawing a Family Map: An Experiential Tool for Engaging Children in Family Therapy',
        by: 'Raymonde H. Dumont — Journal of Family Therapy 30(3), 247–259, 2008',
        detail: 'Cited by the Creately guide.',
        url: 'https://doi.org/10.1111/j.1467-6427.2008.00429.x',
      },
      {
        title:
          'Pruning the Family Tree: An Unexplored Path to Family Business Continuity and Family Harmony',
        by: 'Johan Lambrecht & Jozef Lievens — Family Business Review 21(4), 295–313, 2008',
        detail: 'Cited by the Creately guide.',
        url: 'https://doi.org/10.1177/08944865080210040103',
      },
      {
        title: '“Family tree software for complex families”',
        by: 'r/Genealogy on Reddit, and everyone who replied',
        detail:
          'Divorces, remarriages, adoptions, step-grandparents and grandparents’ siblings that other tools hide — the reason the map shows everyone. Tools suggested there (Family Historian, GenoPro, Family Echo, MacFamilyTree, MyHeritage Family Tree Builder, Family Tree Maker, Lucidchart, Creately) informed the feature set.',
        url: 'https://www.reddit.com/r/Genealogy/comments/1hvrqig/',
      },
      {
        title: 'Example family charts',
        by: 'Supplied by the project owner',
        detail:
          'A boxed descendant tree, a horizontal ancestor chart, a fan chart and a colour-coded generational tree — the visual references for the chart templates.',
      },
    ],
  },
  {
    heading: 'Algorithms & standards',
    items: [
      {
        title: 'Methods for Visual Understanding of Hierarchical System Structures',
        by: 'K. Sugiyama, S. Tagawa & M. Toda — IEEE Transactions on Systems, Man, and Cybernetics 11(2), 1981',
        detail:
          'Layered drawing and the barycenter heuristic behind the family map’s row ordering.',
        url: 'https://doi.org/10.1109/TSMC.1981.4308636',
      },
      {
        title: 'An Empirical Distribution Function for Sampling with Incomplete Information',
        by: 'M. Ayer, H. D. Brunk, G. M. Ewing, W. T. Reid & E. Silverman — Annals of Mathematical Statistics 26(4), 1955',
        detail: 'The pool-adjacent-violators algorithm, used to space each row without overlaps.',
        url: 'https://doi.org/10.1214/aoms/1177728423',
      },
      {
        title: 'Tidier Drawings of Trees',
        by: 'E. M. Reingold & J. S. Tilford — IEEE Transactions on Software Engineering SE-7(2), 1981',
        detail: 'The idea of centring parents over their subtrees in the descendant chart.',
        url: 'https://doi.org/10.1109/TSE.1981.234519',
      },
      {
        title: 'The GEDCOM Standard, Release 5.5.1',
        by: 'The Church of Jesus Christ of Latter-day Saints, 1999',
        detail: 'Genealogy interchange format used for export (including PEDI, MARR and DIV).',
        url: 'https://gedcom.io',
      },
      {
        title: 'RFC 4180: Common Format and MIME Type for CSV Files',
        by: 'Y. Shafranovich, 2005',
        detail: 'The CSV export/import format.',
        url: 'https://www.rfc-editor.org/rfc/rfc4180',
      },
    ],
  },
  {
    heading: 'Open-source software',
    intro: 'With thanks to the maintainers of:',
    items: [
      { title: 'React & React DOM', by: 'Meta and contributors', url: 'https://react.dev' },
      {
        title: 'React Router',
        by: 'Remix Software and contributors',
        url: 'https://reactrouter.com',
      },
      { title: 'Vite', by: 'Evan You and contributors', url: 'https://vite.dev' },
      { title: 'TypeScript', by: 'Microsoft', url: 'https://www.typescriptlang.org' },
      { title: 'Zustand', by: 'Poimandres', url: 'https://github.com/pmndrs/zustand' },
      {
        title: 'TipTap & ProseMirror',
        by: 'überdosis; Marijn Haverbeke',
        url: 'https://tiptap.dev',
      },
      { title: 'Supabase JS', by: 'Supabase', url: 'https://supabase.com' },
      {
        title: 'idb-keyval',
        by: 'Jake Archibald',
        url: 'https://github.com/jakearchibald/idb-keyval',
      },
      {
        title: 'jsPDF',
        by: 'James Hall and contributors',
        url: 'https://github.com/parallax/jsPDF',
      },
      { title: 'html2canvas', by: 'Niklas von Hertzen', url: 'https://html2canvas.hertzen.com' },
      { title: 'Vitest', by: 'Vitest team', url: 'https://vitest.dev' },
      { title: 'Playwright', by: 'Microsoft', url: 'https://playwright.dev' },
      {
        title: 'ESLint & Prettier',
        by: 'OpenJS Foundation; Prettier team',
        url: 'https://eslint.org',
      },
      {
        title: 'fake-indexeddb',
        by: 'Jeremy Scheff',
        url: 'https://github.com/dumbmatter/fakeIndexedDB',
      },
    ],
  },
  {
    heading: 'Type & words',
    items: [
      {
        title: 'Cinzel',
        by: 'Natanael Gama — SIL Open Font License',
        url: 'https://fonts.google.com/specimen/Cinzel',
      },
      {
        title: 'Cormorant Garamond',
        by: 'Christian Thalmann — SIL Open Font License',
        url: 'https://fonts.google.com/specimen/Cormorant+Garamond',
      },
      {
        title:
          '“To forget one’s ancestors is to be a brook without a source, a tree without a root.”',
        by: 'Chinese proverb, quoted on the home page',
      },
    ],
  },
  {
    heading: 'Hosting & making',
    items: [
      { title: 'GitHub Pages and GitHub Actions', by: 'GitHub', url: 'https://pages.github.com' },
      { title: 'Supabase (Postgres, Auth, Storage)', by: 'Supabase', url: 'https://supabase.com' },
      {
        title: 'Built by the project owner, with Claude Code',
        by: 'Anthropic',
        url: 'https://claude.com/claude-code',
      },
    ],
  },
];

/** Plain-text version, kept identical to credits.txt (checked by a unit test). */
export function creditsText(): string {
  const lines = ['FAMILY TREE — THANKS & CREDITS', '', 'Everything this project drew on.', ''];
  for (const s of CREDITS) {
    lines.push(s.heading.toUpperCase(), '-'.repeat(s.heading.length));
    if (s.intro) lines.push(s.intro);
    lines.push('');
    for (const c of s.items) {
      lines.push(`* ${c.title}`);
      if (c.by) lines.push(`  ${c.by}`);
      if (c.detail) lines.push(`  ${c.detail}`);
      if (c.url) lines.push(`  ${c.url}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}
