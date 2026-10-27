import type { Gender, Person } from './types';
import { yearOf } from './people';

export type LifeStage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export interface Portrait {
  stage: LifeStage;
  gender: Gender;
  deceased: boolean;
  /** Age now, or at death; null when nothing could be inferred. */
  age: number | null;
  /** True when the age was guessed from the generation rather than a recorded birth year. */
  estimated: boolean;
}

/** Years between generations, used to guess an age when no birth year is recorded. */
export const GENERATION_YEARS = 28;

export function stageForAge(age: number): LifeStage {
  if (age < 3) return 'baby';
  if (age < 13) return 'child';
  if (age < 20) return 'teen';
  if (age < 60) return 'adult';
  return 'elder';
}

/**
 * Choose a default portrait. `gen` is the generation relative to "me" (negative = older) and
 * `meBirth` my birth year if known; they let us guess sensibly for people with no dates.
 */
export function portraitFor(
  p: Person,
  gen: number,
  meBirth: number | null,
  now = new Date().getFullYear(),
): Portrait {
  const deceased = !!p.died.trim();
  const death = yearOf(p.died);
  let birth = yearOf(p.year);
  let estimated = false;
  if (birth === null) {
    // Assume "me" is a working-age adult unless told otherwise.
    birth = (meBirth ?? now - 35) + gen * GENERATION_YEARS;
    estimated = true;
  }
  let end = death ?? now;
  // Died, date unknown: assume a full life unless the estimate already says otherwise.
  if (deceased && death === null) end = Math.min(now, birth + 75);
  const age = Math.max(0, end - birth);
  return {
    stage: stageForAge(age),
    gender: p.gender,
    deceased,
    age: estimated ? null : age,
    estimated,
  };
}
