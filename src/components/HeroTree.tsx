import { useId } from 'react';
import type { LifeStage } from '../model/age';
import type { Gender } from '../model/types';
import { AvatarBody } from './Avatar';

type HeroNode = {
  x: number;
  y: number;
  r: number;
  spouse?: boolean;
  me?: boolean;
  d: number;
  stage: LifeStage;
  gender: Gender;
};

/** Decorative animated tree: gold branches draw in, then portrait medallions appear. */
export function HeroTree({ className = '' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const nodes: HeroNode[] = [
    { x: 150, y: 70, r: 30, d: 0.2, stage: 'elder', gender: 'male' },
    { x: 270, y: 70, r: 30, spouse: true, d: 0.3, stage: 'elder', gender: 'female' },
    { x: 90, y: 200, r: 30, d: 0.9, stage: 'adult', gender: 'male' },
    { x: 210, y: 200, r: 34, me: true, d: 1.0, stage: 'adult', gender: 'female' },
    { x: 330, y: 200, r: 30, spouse: true, d: 1.1, stage: 'adult', gender: 'male' },
    { x: 270, y: 330, r: 30, d: 1.7, stage: 'child', gender: 'female' },
  ];
  const lines = [
    { d: 'M180 70 H240', bond: true, delay: 0.5 },
    { d: 'M210 100 V140 M90 140 H210 V166 M90 140 V170', delay: 0.6 },
    { d: 'M244 200 H300', bond: true, delay: 1.2 },
    { d: 'M272 200 V270 M272 270 V300', delay: 1.4 },
  ];
  return (
    <svg className={`hero-tree ${className}`} viewBox="0 0 420 380" aria-hidden="true">
      <defs>
        <radialGradient id="ht-ivory" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fbf4e1" />
          <stop offset="1" stopColor="#e4d3a6" />
        </radialGradient>
        <linearGradient id="ht-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e7b8" />
          <stop offset="1" stopColor="#a07c2c" />
        </linearGradient>
      </defs>
      {lines.map((l, i) => (
        <path
          key={i}
          className="ht-line"
          d={l.d}
          pathLength={1}
          fill="none"
          stroke={l.bond ? '#c7607c' : '#d8b765'}
          strokeWidth={2.2}
          strokeLinecap="round"
          style={{ animationDelay: `${l.delay}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g
          key={i}
          className="ht-node"
          style={{ animationDelay: `${n.d}s`, transformOrigin: `${n.x}px ${n.y}px` }}
        >
          {n.me && <circle cx={n.x} cy={n.y} r={n.r + 12} fill="rgba(227,196,112,.18)" />}
          <circle cx={n.x} cy={n.y} r={n.r + 5} fill={n.spouse ? '#c7607c' : 'url(#ht-gold)'} />
          <circle cx={n.x} cy={n.y} r={n.r + 2.5} fill="#0b1530" />
          <circle cx={n.x} cy={n.y} r={n.r + 1.5} fill="url(#ht-gold)" />
          <circle cx={n.x} cy={n.y} r={n.r} fill="url(#ht-ivory)" />
          <clipPath id={`${uid}-c${i}`}>
            <circle cx={n.x} cy={n.y} r={n.r} />
          </clipPath>
          <g clipPath={`url(#${uid}-c${i})`}>
            <svg x={n.x - n.r} y={n.y - n.r} width={n.r * 2} height={n.r * 2} viewBox="0 0 100 100">
              <AvatarBody stage={n.stage} gender={n.gender} />
            </svg>
          </g>
        </g>
      ))}
      <path
        className="ht-heart"
        d="M210 76 c-6-5-9-9-5-13 3-3 5-1 5 1 0-2 2-4 5-1 4 4 1 8-5 13z"
        fill="#c7607c"
        style={{ animationDelay: '0.9s' }}
      />
      <path
        className="ht-heart"
        d="M272 206 c-6-5-9-9-5-13 3-3 5-1 5 1 0-2 2-4 5-1 4 4 1 8-5 13z"
        fill="#c7607c"
        style={{ animationDelay: '1.5s' }}
      />
    </svg>
  );
}
