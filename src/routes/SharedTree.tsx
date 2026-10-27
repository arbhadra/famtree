import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { TreeState } from '../model/types';
import { updatePerson } from '../model/tree';
import { fetchSharedTree } from '../data/cloudRepo';
import { supabase } from '../lib/supabase';
import { useFamilyMap } from '../hooks/useFamilyMap';
import { TreeCanvas, useTreeCanvas } from '../components/TreeCanvas';
import { PersonPanel, type PanelTab } from '../components/PersonPanel';
import * as I from '../components/Icons';

/** Read-only view of someone's tree via a share link. */
export function SharedTree() {
  const { token = '' } = useParams();
  const [tree, setTree] = useState<TreeState | null>(null);
  const [error, setError] = useState(
    supabase ? '' : 'Sharing isn’t available on this copy of the site.',
  );

  useEffect(() => {
    if (!supabase) return;
    fetchSharedTree(supabase, token)
      .then((t) => (t ? setTree(t) : setError('This link is no longer shared.')))
      .catch(() => setError('This link is invalid or has been revoked.'));
  }, [token]);

  return (
    <div className="tree-page">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="mark" aria-hidden="true">
            <I.Crest width={40} height={46} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Family Tree</span>
            <span className="brand-sub">A shared family chronicle · view only</span>
          </span>
        </Link>
        <div className="header-tools">
          <Link className="btn primary" to="/">
            Start your own
          </Link>
        </div>
      </header>
      {tree ? (
        <SharedMap tree={tree} onChange={setTree} />
      ) : (
        <main className="page-main">
          <div className="empty-state folio-lite">
            {error ? <h2>{error}</h2> : <h2>Opening the chronicle…</h2>}
          </div>
        </main>
      )}
    </div>
  );
}

function SharedMap({ tree, onChange }: { tree: TreeState; onChange: (t: TreeState) => void }) {
  const canvas = useTreeCanvas();
  const map = useFamilyMap(tree);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('details');
  const { centerOn } = canvas;

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => centerOn(tree.meId)));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TreeCanvas
        canvas={canvas}
        tree={tree}
        layout={map.layout}
        sizes={map.sizes}
        labels={map.labels}
        portraits={map.portraits}
        visible={map.visible}
        focusId={null}
        readOnly
        onOpen={(id) => {
          setPanelId(id);
          setTab('details');
        }}
        onToggle={(id, which) =>
          onChange(updatePerson(tree, id, { [which]: !tree.people[id][which] }))
        }
      />
      <PersonPanel
        tree={tree}
        person={panelId ? tree.people[panelId] : null}
        tab={tab}
        onTab={setTab}
        autoFocusName={false}
        entries={[]}
        labels={map.labels}
        computed={map.computed}
        portraits={map.portraits}
        readOnly
        onClose={() => setPanelId(null)}
        onJump={(id) => {
          setPanelId(id);
          centerOn(id, true);
        }}
      />
    </>
  );
}
