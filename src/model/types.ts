export type Gender = 'male' | 'female' | 'other' | 'self';
export type Side = 'self' | 'spouse';

/** How a child is linked to a parent. Birth and adoptive links count as lineage. */
export const PARENT_LINKS = ['birth', 'adopted', 'step', 'foster', 'guardian'] as const;
export type ParentLink = (typeof PARENT_LINKS)[number];

export const UNION_STATUSES = [
  'married',
  'partner',
  'engaged',
  'separated',
  'divorced',
  'widowed',
] as const;
export type UnionStatus = (typeof UNION_STATUSES)[number];

/** A partnership between two people (key: sorted ids joined by "|"). */
export interface Union {
  status: UnionStatus;
  /** Free-form dates, e.g. "1985" or "12 Jun 1985". */
  start: string;
  end: string;
}

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  side: Side;
  /** Optional custom label ("Godmother"); when empty the relationship is computed. */
  relation: string;
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
  /** Link type per parent id; a missing entry means "birth". */
  parentTypes: Record<string, ParentLink>;
  spouses: string[];
}

/** Flat id graph: relationships are by id; children and siblings are derived by query. */
export interface TreeState {
  people: Record<string, Person>;
  meId: string;
  /** Partnership details by union key; a missing entry means "married". */
  unions: Record<string, Union>;
  /** Data format version (2 adds unions, parent link types and computed relationships). */
  version: number;
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
