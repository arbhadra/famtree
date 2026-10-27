import type { LifeStage } from '../model/age';
import type { Gender } from '../model/types';

/* Default portraits drawn in the site's palette: a bust for each gender and life stage. */

const SKIN = '#e8d0a8';
const SKIN_SHADE = '#d7b98d';
const HAIR = '#4a3324';
const SILVER = '#cfccd2';
const GOLD = '#c9a24a';
const IVORY = '#f6eedb';
const CLOTH: Record<'male' | 'female' | 'other', string> = {
  male: '#22386b',
  female: '#7b1e3a',
  other: '#3d5a52',
};
const BABY_CLOTH: Record<'male' | 'female' | 'other', string> = {
  male: '#9db4d8',
  female: '#e0a9b8',
  other: '#b9cfb0',
};

type G = 'male' | 'female' | 'other';
const norm = (g: Gender): G => (g === 'male' || g === 'female' ? g : 'other');

function Head({ cy = 44, rx = 15, ry = 17 }: { cy?: number; rx?: number; ry?: number }) {
  return (
    <>
      <ellipse cx={50 - rx} cy={cy + 2} rx={2.6} ry={4} fill={SKIN_SHADE} />
      <ellipse cx={50 + rx} cy={cy + 2} rx={2.6} ry={4} fill={SKIN_SHADE} />
      <ellipse cx={50} cy={cy} rx={rx} ry={ry} fill={SKIN} />
    </>
  );
}

function Glasses({ cy = 45 }: { cy?: number }) {
  return (
    <g fill="none" stroke="#3a2a1c" strokeWidth={1.3}>
      <circle cx={44} cy={cy} r={4.6} />
      <circle cx={56} cy={cy} r={4.6} />
      <path d={`M48.6 ${cy} h2.8`} />
    </g>
  );
}

function Baby({ g }: { g: G }) {
  return (
    <>
      <path d="M22 100 C20 80 33 70 50 70 C67 70 80 80 78 100 Z" fill={BABY_CLOTH[g]} />
      <path
        d="M34 78 C42 84 58 84 66 78"
        stroke={IVORY}
        strokeWidth={2}
        fill="none"
        opacity={0.7}
      />
      <circle cx={50} cy={48} r={20} fill={SKIN} />
      <circle cx={39} cy={54} r={3.4} fill="#e9a796" opacity={0.55} />
      <circle cx={61} cy={54} r={3.4} fill="#e9a796" opacity={0.55} />
      <path
        d="M47 30 C44 25 48 21 53 23 C50 24 50 27 52 29"
        stroke={HAIR}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      {g === 'female' && <path d="M58 31 l5 -3 l-1 5 z M58 31 l4 4 l-5 1 z" fill={GOLD} />}
    </>
  );
}

function Child({ g }: { g: G }) {
  return (
    <>
      {g === 'female' && (
        <>
          <circle cx={30} cy={44} r={7} fill={HAIR} />
          <circle cx={70} cy={44} r={7} fill={HAIR} />
          <circle cx={34} cy={39} r={2.4} fill={GOLD} />
          <circle cx={66} cy={39} r={2.4} fill={GOLD} />
        </>
      )}
      <path d="M26 100 C26 85 36 78 50 78 C64 78 74 85 74 100 Z" fill={CLOTH[g]} />
      <path d="M43 78 C45 83 55 83 57 78" fill={IVORY} />
      <rect x={45} y={60} width={10} height={20} rx={4} fill={SKIN_SHADE} />
      <Head cy={46} rx={16} ry={17} />
      {g === 'male' ? (
        <path
          d="M34 44 C33 30 41 27 50 27 C59 27 67 30 66 44 L62 38 L58 41 L55 36 L50 40 L45 36 L42 41 L38 38 Z"
          fill={HAIR}
        />
      ) : g === 'female' ? (
        <path
          d="M34 43 C34 31 42 27 50 27 C58 27 66 31 66 43 C61 36 55 34 50 35 C45 34 39 36 34 43 Z"
          fill={HAIR}
        />
      ) : (
        <path
          d="M34 44 C33 31 41 27 50 27 C59 27 67 31 66 44 C62 38 56 36 50 36 C44 36 38 38 34 44 Z"
          fill={HAIR}
        />
      )}
    </>
  );
}

function Teen({ g }: { g: G }) {
  return (
    <>
      {g === 'female' && (
        <path
          d="M33 46 C31 28 41 23 50 23 C59 23 69 28 67 46 C68 62 66 74 62 80 L38 80 C34 74 32 62 33 46 Z"
          fill={HAIR}
        />
      )}
      <path d="M22 100 C22 82 34 74 50 74 C66 74 78 82 78 100 Z" fill={CLOTH[g]} />
      <path d="M42 74 C44 81 56 81 58 74" fill={IVORY} />
      <rect x={44} y={58} width={12} height={18} rx={4} fill={SKIN_SHADE} />
      <Head />
      {g === 'male' ? (
        <path
          d="M35 42 C33 28 42 22 52 23 C60 23 67 28 65 42 C63 35 58 32 52 32 C48 32 43 30 41 27 C39 31 37 35 35 42 Z"
          fill={HAIR}
        />
      ) : g === 'female' ? (
        <>
          <path
            d="M35 41 C35 29 43 25 50 25 C58 25 65 29 65 41 C60 34 54 32 50 32 C45 33 40 35 35 41 Z"
            fill={HAIR}
          />
          <path d="M36 33 C42 27 58 27 64 33" stroke={GOLD} strokeWidth={2} fill="none" />
        </>
      ) : (
        <path
          d="M35 43 C33 28 42 24 50 24 C59 24 67 28 65 43 C63 37 58 33 50 33 C42 33 37 37 35 43 Z"
          fill={HAIR}
        />
      )}
    </>
  );
}

function Adult({ g }: { g: G }) {
  return (
    <>
      {g === 'female' && (
        <path
          d="M32 46 C30 27 40 22 50 22 C60 22 70 27 68 46 C69 60 66 71 62 75 L38 75 C34 71 31 60 32 46 Z"
          fill={HAIR}
        />
      )}
      <path d="M17 100 C17 80 31 72 50 72 C69 72 83 80 83 100 Z" fill={CLOTH[g]} />
      {g === 'male' ? (
        <>
          <path d="M42 72 L50 86 L58 72 Z" fill={IVORY} />
          <path d="M48.4 76 h3.2 l1.2 13 l-2.8 4 l-2.8 -4 z" fill={GOLD} />
          <path d="M42 72 L47 90 L38 80 Z M58 72 L53 90 L62 80 Z" fill="#162650" />
        </>
      ) : g === 'female' ? (
        <>
          <path d="M40 72 C42 82 58 82 60 72" fill={SKIN_SHADE} />
          {[40.5, 44, 47.5, 50, 52.5, 56, 59.5].map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={74 + Math.sin((i / 6) * Math.PI) * 6.5}
              r={1.4}
              fill={GOLD}
            />
          ))}
        </>
      ) : (
        <path d="M41 72 C43 80 57 80 59 72" fill={IVORY} />
      )}
      <rect x={44} y={58} width={12} height={16} rx={4} fill={SKIN_SHADE} />
      <Head />
      {g === 'male' ? (
        <path
          d="M35 42 C34 28 42 24 50 24 C60 24 66 30 65 42 C62 36 56 33 50 33 C44 33 38 36 35 42 Z"
          fill={HAIR}
        />
      ) : g === 'female' ? (
        <path
          d="M35 41 C36 28 44 25 50 25 C58 25 64 29 65 41 C61 33 55 31 49 32 C44 33 39 36 35 41 Z"
          fill={HAIR}
        />
      ) : (
        <path
          d="M34 44 C33 28 42 23 50 23 C59 23 67 28 66 44 C64 38 60 35 54 34 C48 33 41 36 34 44 Z"
          fill={HAIR}
        />
      )}
    </>
  );
}

function Elder({ g }: { g: G }) {
  return (
    <>
      <path d="M17 100 C17 80 31 72 50 72 C69 72 83 80 83 100 Z" fill={CLOTH[g]} />
      {g === 'male' ? (
        <>
          <path d="M44 72 L50 82 L56 72 Z" fill={IVORY} />
          <path d="M44 72 L50 100 M56 72 L50 100" stroke="#162650" strokeWidth={2} />
          <circle cx={50} cy={88} r={1.3} fill={GOLD} />
          <circle cx={50} cy={95} r={1.3} fill={GOLD} />
        </>
      ) : g === 'female' ? (
        <>
          <path d="M20 96 C30 78 40 74 50 86 C60 74 70 78 80 96" fill="#5e1429" />
          {[42, 46, 50, 54, 58].map((x, i) => (
            <circle key={i} cx={x} cy={75 + Math.sin((i / 4) * Math.PI) * 4} r={1.6} fill={IVORY} />
          ))}
        </>
      ) : (
        <path d="M41 72 C43 80 57 80 59 72" fill={IVORY} />
      )}
      <rect x={44} y={58} width={12} height={16} rx={4} fill={SKIN_SHADE} />
      <Head />
      {g === 'male' ? (
        <>
          <path
            d="M35 46 C33 37 36 32 40 31 L41 44 Z M65 46 C67 37 64 32 60 31 L59 44 Z"
            fill={SILVER}
          />
          <path
            d="M37 50 C38 64 44 70 50 70 C56 70 62 64 63 50 C60 56 56 58 50 58 C44 58 40 56 37 50 Z"
            fill={SILVER}
          />
        </>
      ) : g === 'female' ? (
        <>
          <circle cx={50} cy={24} r={7.5} fill={SILVER} />
          <path
            d="M35 43 C35 29 43 26 50 26 C57 26 65 29 65 43 C61 35 56 33 50 33 C44 33 39 35 35 43 Z"
            fill={SILVER}
          />
        </>
      ) : (
        <path
          d="M35 43 C34 29 42 25 50 25 C58 25 66 29 65 43 C62 36 57 33 50 33 C43 33 38 36 35 43 Z"
          fill={SILVER}
        />
      )}
      <Glasses />
    </>
  );
}

interface Props {
  stage: LifeStage;
  gender: Gender;
  className?: string;
}

const BODIES = { baby: Baby, child: Child, teen: Teen, adult: Adult, elder: Elder };

/** The portrait drawing itself, in a 100×100 box, for embedding in other SVGs. */
export function AvatarBody({ stage, gender }: { stage: LifeStage; gender: Gender }) {
  const Body = BODIES[stage];
  return <Body g={norm(gender)} />;
}

export function Avatar({ stage, gender, className }: Props) {
  return (
    <svg className={`avatar-art ${className ?? ''}`} viewBox="0 0 100 100" aria-hidden="true">
      <AvatarBody stage={stage} gender={gender} />
    </svg>
  );
}

/** Small black ribbon marking someone who has died. */
export function MourningRibbon() {
  return (
    <svg className="ribbon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3c-3 0-5 2.6-5 5.4 0 2.4 1.6 4.4 3 6.1L5.5 21l3 .5L12 16l3.5 5.5 3-.5-4.5-6.5c1.4-1.7 3-3.7 3-6.1C17 5.6 15 3 12 3zm0 2.6c1.3 0 2.3 1.2 2.3 2.8 0 1.4-1 2.8-2.3 4.3-1.3-1.5-2.3-2.9-2.3-4.3 0-1.6 1-2.8 2.3-2.8z"
        fill="#16161c"
        stroke="#c9a24a"
        strokeWidth="0.8"
      />
    </svg>
  );
}
