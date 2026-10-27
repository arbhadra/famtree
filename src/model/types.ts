export type Gender = 'male' | 'female' | 'other' | 'self';
export type Side = 'self' | 'spouse';

export interface Person {
  id: string;
  name: string;
  relation: string;
  gender: Gender;
  side: Side;
  year: string;
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
