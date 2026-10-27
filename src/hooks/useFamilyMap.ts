import { useEffect, useMemo, useState } from 'react';
import type { TreeState } from '../model/types';
import { computeLayout, SIZES, SIZES_COMPACT } from '../model/layout';
import { visibleIds, type ViewMode } from '../model/view';
import { kinshipMap, relationLabel } from '../model/kinship';
import { portraitFor, type Portrait } from '../model/age';
import { yearOf } from '../model/people';

const COMPACT = '(max-width: 680px)';

export function useCompact() {
  const [compact, setCompact] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(COMPACT).matches,
  );
  useEffect(() => {
    const mq = matchMedia(COMPACT);
    const on = () => setCompact(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return compact;
}

/** Everything the map needs, derived from the tree: who is shown, where, and how they're labelled. */
export function useFamilyMap(tree: TreeState, mode: ViewMode = 'everyone') {
  const compact = useCompact();
  const sizes = compact ? SIZES_COMPACT : SIZES;
  const visible = useMemo(() => visibleIds(tree, mode), [tree, mode]);
  const layout = useMemo(() => computeLayout(tree, visible, sizes), [tree, visible, sizes]);
  const computed = useMemo(() => kinshipMap(tree), [tree]);
  const labels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of Object.values(tree.people)) out[p.id] = relationLabel(p, computed);
    return out;
  }, [tree, computed]);
  const portraits = useMemo(() => {
    const meLayer = layout.nodes[tree.meId]?.layer ?? 0;
    const meBirth = yearOf(tree.people[tree.meId]?.year);
    const out: Record<string, Portrait> = {};
    for (const n of Object.values(layout.nodes))
      out[n.id] = portraitFor(tree.people[n.id], n.layer - meLayer, meBirth);
    return out;
  }, [tree, layout]);
  return { sizes, visible, layout, labels, computed, portraits, compact };
}
