import type { ReactNode, SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>, children: ReactNode, sw = 2) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

type P = SVGProps<SVGSVGElement>;

export const Plus = (p: P) => base(p, <path d="M12 5v14M5 12h14" />, 2.6);
export const X = (p: P) => base(p, <path d="M6 6l12 12M18 6L6 18" />, 2.6);
export const Up = (p: P) => base(p, <path d="M6 15l6-6 6 6" />, 2.4);
export const Down = (p: P) => base(p, <path d="M6 9l6 6 6-6" />, 2.4);
export const User = (p: P) =>
  base(
    { width: 40, height: 40, ...p },
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>,
    1.6,
  );
export const Parent = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21c0-4 3-6 7-6s7 2 7 6" />
    </>,
  );
export const Child = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="9" r="3.2" />
      <path d="M7 20c0-3 2-5 5-5s5 2 5 5" />
    </>,
  );
export const Siblings = (p: P) =>
  base(
    p,
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M3 20c0-2.5 2-4 5-4M21 20c0-2.5-2-4-5-4" />
    </>,
  );
export const Heart = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 21s-7.4-4.6-9.9-9.2C.5 8.6 2 5 5.4 5c2 0 3.3 1.1 4 2.2C10.3 6.1 11.6 5 13.6 5 17 5 18.5 8.6 16.9 11.8 14.4 16.4 12 21 12 21z" />
  </svg>
);
export const Camera = (p: P) =>
  base(
    p,
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>,
  );
export const Trash = (p: P) => base(p, <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />);
export const Download = (p: P) =>
  base(
    p,
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>,
  );
export const TreeMark = (p: P) =>
  base(
    p,
    <>
      <path d="M12 22v-6" />
      <circle cx="12" cy="7" r="4" />
      <path d="M5 13a4 4 0 0 0 4 3" />
      <path d="M19 13a4 4 0 0 1-4 3" />
    </>,
    1.8,
  );
export const Locate = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>,
  );
export const ZoomOutIcon = (p: P) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </>,
  );
export const ZoomInIcon = (p: P) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4M8 11h6M11 8v6" />
    </>,
  );

/** Heraldic crest: crowned shield with a tree. Used as the brand mark. */
export const Crest = (p: P) => (
  <svg viewBox="0 0 64 74" role="img" aria-label="Family crest" {...p}>
    <defs>
      <linearGradient id="crest-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6e7b8" />
        <stop offset="0.5" stopColor="#c9a24a" />
        <stop offset="1" stopColor="#8f6d22" />
      </linearGradient>
      <linearGradient id="crest-field" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a2b57" />
        <stop offset="1" stopColor="#0b1530" />
      </linearGradient>
    </defs>
    {/* crown */}
    <path
      d="M12 22 L14 6 L24 14 L32 2 L40 14 L50 6 L52 22 Z"
      fill="url(#crest-gold)"
      stroke="#6d5116"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <circle cx="14" cy="6" r="2.2" fill="#f6e7b8" />
    <circle cx="32" cy="2.6" r="2.4" fill="#f6e7b8" />
    <circle cx="50" cy="6" r="2.2" fill="#f6e7b8" />
    <rect x="12" y="22" width="40" height="4.5" rx="1" fill="url(#crest-gold)" stroke="#6d5116" />
    {/* shield */}
    <path
      d="M9 30 H55 V48 C55 62 44 69 32 72 C20 69 9 62 9 48 Z"
      fill="url(#crest-field)"
      stroke="url(#crest-gold)"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M14 34 H50 V48 C50 59 41 64.5 32 67 C23 64.5 14 59 14 48 Z"
      fill="none"
      stroke="#c9a24a"
      strokeOpacity="0.55"
      strokeWidth="0.8"
    />
    {/* tree */}
    <g stroke="url(#crest-gold)" strokeWidth="2" strokeLinecap="round" fill="none">
      <path d="M32 62 V46" />
      <path d="M32 54 C27 53 24 50 23 45" />
      <path d="M32 54 C37 53 40 50 41 45" />
      <path d="M32 48 C29 46 28 43 28 40" />
      <path d="M32 48 C35 46 36 43 36 40" />
    </g>
    <circle cx="32" cy="40.5" r="3.4" fill="url(#crest-gold)" />
    <circle cx="23" cy="44" r="2.6" fill="url(#crest-gold)" />
    <circle cx="41" cy="44" r="2.6" fill="url(#crest-gold)" />
  </svg>
);

export const Book = (p: P) =>
  base(
    p,
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5" />
      <path d="M15 2v8l-2-1.5L11 10V2" />
    </>,
  );
export const Search = (p: P) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>,
  );
export const Undo = (p: P) =>
  base(
    p,
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>,
  );
export const Redo = (p: P) =>
  base(
    p,
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </>,
  );
export const More = (p: P) =>
  base(
    p,
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>,
    2.4,
  );
export const Share = (p: P) =>
  base(
    p,
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </>,
  );
export const Hourglass = (p: P) =>
  base(p, <path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" />);
export const ArrowLeft = (p: P) => base(p, <path d="M19 12H5M12 19l-7-7 7-7" />);
export const ImageIcon = (p: P) =>
  base(
    p,
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>,
  );
export const FileIcon = (p: P) =>
  base(
    p,
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>,
  );
export const Pen = (p: P) =>
  base(p, <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />);
export const Eye = (p: P) =>
  base(
    p,
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );
export const Printer = (p: P) =>
  base(
    p,
    <>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </>,
  );
export const LogOut = (p: P) =>
  base(p, <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />);
export const Check = (p: P) => base(p, <path d="M20 6L9 17l-5-5" />, 2.6);
export const Upload = (p: P) =>
  base(
    p,
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </>,
  );
export const Fan = (p: P) =>
  base(
    p,
    <>
      <path d="M2 18a10 10 0 0 1 20 0" />
      <path d="M6 18a6 6 0 0 1 12 0" />
      <path d="M12 8v4M4.9 10.9l2.8 2.8M19.1 10.9l-2.8 2.8M10 18h4" />
    </>,
  );
export const Expand = (p: P) => base(p, <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const Google = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"
    />
  </svg>
);
