export type Gender = 'male' | 'female' | 'other' | 'self';
export type Side = 'self' | 'spouse';

export interface Person {
  id: string;
  name: string;
  relation: string;
  gender: Gender;
  side: Side;
  /** Birth date, free-form: "1958", "12 Mar 1958", "c. 1900". Named `year` for storage compatibility. */
  year: string;
  died: string;
  birthplace: string;
  occupation: string;
  notes: string;
  photo: string | null;
  collapsedUp: boolean;
  collapsedDown: boolean;
  parents: string[];
  spouses: string[];
}

/** Flat id graph: relationships are by id; children and siblings are derived by query. */
export interface TreeState {
  people: Record<string, Person>;
  meId: string;
}

/** Result of a mutation: the next state, plus UI hints. */
export interface Change {
  state: TreeState;
  focusId?: string;
  message?: string;
}

/* ------------------------------- logbook ------------------------------ */

export const ENTRY_TYPES = [
  'memory',
  'event',
  'birth',
  'marriage',
  'death',
  'migration',
  'story',
  'recipe',
  'document',
  'other',
] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const DATE_QUALIFIERS = ['exact', 'about', 'before', 'after', 'between'] as const;
export type DateQualifier = (typeof DATE_QUALIFIERS)[number];

/** Where a media file lives: inline (guest mode) or in cloud storage (signed-in mode). */
export type MediaRef = { kind: 'inline'; dataUrl: string } | { kind: 'storage'; path: string };

export interface MediaItem {
  id: string;
  name: string;
  mime: string;
  caption: string;
  ref: MediaRef;
}

export interface LogEntry {
  id: string;
  title: string;
  type: EntryType;
  /** ISO-like partial date: "1950", "1950-06" or "1950-06-14". Empty when unknown. */
  date: string;
  dateEnd: string;
  dateQualifier: DateQualifier;
  place: string;
  people: string[];
  /** Story as sanitized HTML from the rich-text editor. */
  body: string;
  media: MediaItem[];
  sources: string;
  needsVerification: boolean;
  status: 'draft' | 'complete';
  createdAt: string;
  updatedAt: string;
}
