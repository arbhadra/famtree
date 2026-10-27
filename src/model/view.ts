import type { TreeState } from './types';
import { childrenOf, isLineage, lineageParents, linkType } from './tree';
import { bloodRelation } from './kinship';

export type ViewMode = 'everyone' | 'blood' | 'direct';

export const VIEW_LABELS: Record<ViewMode, string> = {
  everyone: 'Everyone',
  blood: 'Blood relatives',
  direct: 'Direct line',
};

function lineageAncestors(s: TreeState, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const p = s.people[stack.pop()!];
    if (!p) continue;
    for (const par of lineageParents(s, p)) {
      if (!out.has(par)) {
        out.add(par);
        stack.push(par);
      }
    }
  }
  return out;
}

function lineageDescendants(s: TreeState, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of childrenOf(s, cur)) {
      if (isLineage(linkType(c, cur)) && !out.has(c.id)) {
        out.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return out;
}

/** Who the selected view allows, before folding (partners of allowed people are included). */
export function allowedIds(s: TreeState, mode: ViewMode): Set<string> {
  const all = Object.keys(s.people);
  if (mode === 'everyone') return new Set(all);
  let core: Set<string>;
  if (mode === 'direct') {
    core = new Set([s.meId, ...lineageAncestors(s, s.meId), ...lineageDescendants(s, s.meId)]);
  } else {
    const cache = new Map<string, Map<string, number>>();
    core = new Set(all.filter((id) => bloodRelation(s, s.meId, id, cache)));
  }
  const out = new Set(core);
  for (const id of core) for (const sp of s.people[id].spouses) if (s.people[sp]) out.add(sp);
  return out;
}

/**
 * Everyone reachable from "me" through allowed people, without crossing a folded branch:
 * a person with `collapsedUp` hides their parents' side, `collapsedDown` hides their children.
 */
export function visibleIds(s: TreeState, mode: ViewMode = 'everyone'): Set<string> {
  const allowed = allowedIds(s, mode);
  const seen = new Set<string>();
  const queue = [s.meId];
  while (queue.length) {
    const id = queue.shift()!;
    const p = s.people[id];
    if (!p || seen.has(id) || !allowed.has(id)) continue;
    seen.add(id);
    if (!p.collapsedUp) p.parents.forEach((x) => queue.push(x));
    if (!p.collapsedDown) childrenOf(s, id).forEach((c) => queue.push(c.id));
    p.spouses.forEach((x) => queue.push(x));
  }
  return seen;
}
