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
