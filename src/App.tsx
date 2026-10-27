import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Person, TreeState } from './model/types';
import {
  addChild,
  addParent,
  addPartner,
  addSibling,
  freshTree,
  generationSpan,
  removePerson,
  updatePerson,
} from './model/tree';
import { HINT_KEY, loadTree, saveTree, STORE_KEY } from './model/persistence';
import { usePanZoom } from './hooks/usePanZoom';
import { TreeView } from './components/TreeView';
import { Wires } from './components/Wires';
import { PersonPanel, type PanelAction } from './components/PersonPanel';
import { Cropper } from './components/Cropper';
import * as I from './components/Icons';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export default function App() {
  const [initial] = useState(() => loadTree());
  const [tree, setTree] = useState<TreeState>(() => initial ?? freshTree());
  const [showBegin, setShowBegin] = useState(!initial);
  const [beginHiding, setBeginHiding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<{ src: string; personId: string } | null>(null);
  const [toast, setToast] = useState('');
  const [toastOn, setToastOn] = useState(false);

  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number>(0);
  const lastGen = useRef(generationSpan(tree));
  const { scale, setScale } = usePanZoom(viewport);

  useEffect(() => saveTree(tree), [tree]);

  const say = useCallback((m: string) => {
    setToast(m);
    setToastOn(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOn(false), 2800);
  }, []);

  const dismissHint = useCallback(() => {
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* storage unavailable: hint just reappears next visit */
    }
    setShowHint(false);
  }, []);

  /* ----- generations milestone toast ----- */
  const people = Object.keys(tree.people).length;
  const gens = useMemo(() => generationSpan(tree), [tree]);
  useEffect(() => {
    if (gens > lastGen.current && gens >= 2)
      say(`✦ You've traced ${gens} generations of your family`);
    lastGen.current = gens;
  }, [gens, say]);

  /* ----- centring and focusing ----- */
  const centerOnMe = useCallback(() => {
    const vp = viewport.current;
    const d = stage.current?.querySelector<HTMLElement>(`.disc[data-id="${tree.meId}"]`);
    if (!vp || !d) return;
    const dr = d.getBoundingClientRect();
    const vr = vp.getBoundingClientRect();
    vp.scrollLeft += dr.left + dr.width / 2 - (vr.left + vr.width / 2);
    vp.scrollTop += dr.top + dr.height / 2 - (vr.top + vr.height / 2);
  }, [tree.meId]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(centerOnMe));
    return () => cancelAnimationFrame(id);
    // centre once on first paint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const el = stage.current?.querySelector<HTMLElement>(`.disc[data-id="${focusId}"]`);
    el?.scrollIntoView({
      behavior: reduceMotion() ? 'auto' : 'smooth',
      block: 'center',
      inline: 'center',
    });
    const t = window.setTimeout(() => setFocusId(null), 700);
    return () => window.clearTimeout(t);
  }, [focusId]);

  /* ----- actions ----- */
  const closePanel = useCallback(() => setPanelId(null), []);

  const commit = useCallback(
    (c: { state: TreeState; focusId?: string; message?: string }) => {
      setTree(c.state);
      setFocusId(c.focusId ?? null);
      setPanelId(null);
      if (c.message) say(c.message);
      dismissHint();
    },
    [say, dismissHint],
  );

  const onAction = (id: string, a: PanelAction) => {
    switch (a) {
      case 'father':
        return commit(addParent(tree, id, 'male'));
      case 'mother':
        return commit(addParent(tree, id, 'female'));
      case 'partner':
        return commit(addPartner(tree, id));
      case 'sibling':
        return commit(addSibling(tree, id));
      case 'child':
        return commit(addChild(tree, id));
      case 'remove': {
        const p = tree.people[id];
        if (
          !confirm(
            `Remove ${p.name || 'this person'}? Anyone connected only through them is removed too.`,
          )
        )
          return;
        return commit(removePerson(tree, id));
      }
    }
  };

  const onEdit = (id: string, patch: Partial<Person>) => setTree((t) => updatePerson(t, id, patch));
  const onToggle = (id: string, which: 'collapsedUp' | 'collapsedDown') =>
    setTree((t) => updatePerson(t, id, { [which]: !t.people[id][which] }));

  const pickPhoto = (personId: string) => {
    const f = document.createElement('input');
    f.type = 'file';
    f.accept = 'image/*';
    f.addEventListener('change', () => {
      const file = f.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => setCropSrc({ src: String(r.result), personId });
      r.readAsDataURL(file);
    });
    f.click();
  };

  const startOver = () => {
    if (!confirm('Start over with a blank tree? This cannot be undone.')) return;
    localStorage.removeItem(STORE_KEY);
    lastGen.current = 1;
    setTree(freshTree());
    setScale(1);
    setPanelId(null);
    requestAnimationFrame(() => requestAnimationFrame(centerOnMe));
  };

  const exportImage = async () => {
    closePanel();
    const prev = scale;
    setScale(1);
    await nextFrame();
    await new Promise((r) => setTimeout(r, reduceMotion() ? 0 : 650)); // let wires finish drawing
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(stage.current!, {
        backgroundColor: '#f4ead6',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement('a');
      a.download = 'family-tree.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      say('Saved your family tree as a picture');
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    } finally {
      setScale(prev);
    }
  };

  const begin = () => {
    setBeginHiding(true);
    setTimeout(() => {
      setShowBegin(false);
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    }, 600);
  };

  const [fireflies] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      i,
      left: Math.random() * 100,
      top: 10 + Math.random() * 80,
      dur: 5 + Math.random() * 6,
      delay: Math.random() * 6,
    })),
  );

  const panelPerson = panelId ? (tree.people[panelId] ?? null) : null;

  return (
    <>
      <div className="ambient" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        {fireflies.map((f) => (
          <span
            key={f.i}
            className="firefly"
            style={
              {
                left: f.left + '%',
                top: f.top + '%',
                '--dur': f.dur + 's',
                '--delay': f.delay + 's',
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <header>
        <div className="brand">
          <div className="mark" aria-hidden="true">
            <I.TreeMark width={22} height={22} />
          </div>
          <div>
            <h1>Family Tree</h1>
            <p>A calm journey through your family</p>
          </div>
        </div>
        <div className="zoom" role="group" aria-label="Zoom">
          <button aria-label="Zoom out" onClick={() => setScale(scale - 0.1)}>
            −
          </button>
          <div className="lvl">{Math.round(scale * 100)}%</div>
          <button aria-label="Zoom in" onClick={() => setScale(scale + 0.1)}>
            +
          </button>
        </div>
        <button className="btn primary" aria-label="Save as image" onClick={exportImage}>
          <I.Download />
          <span className="lbl">Save image</span>
        </button>
        <button className="btn subtle" aria-label="Start over" onClick={startOver}>
          <I.Trash />
          <span className="lbl">Start over</span>
        </button>
      </header>

      <div id="viewport" ref={viewport}>
        <div id="stageWrap">
          <div id="stage" ref={stage} style={{ transform: `scale(${scale})` }}>
            <Wires tree={tree} stage={stage} scale={scale} layoutKey={focusId} />
            <TreeView tree={tree} focusId={focusId} onOpen={setPanelId} onToggle={onToggle} />
          </div>
        </div>
      </div>

      <div className="hud" aria-live="polite">
        <div className="stat">
          <I.User width={15} height={15} />
          <b>{people}</b> people
        </div>
        <div className="stat">
          <I.TreeMark width={15} height={15} />
          <b>{gens}</b> generations
        </div>
      </div>
      <div className="legend" aria-hidden="true">
        <div>
          <span className="sw" /> parent → child
        </div>
        <div>
          <span className="ht">♥</span> partners
        </div>
      </div>
      <button
        id="locate"
        aria-label="Center on me"
        title="Center on me"
        onClick={() => {
          setScale(1);
          requestAnimationFrame(centerOnMe);
        }}
      >
        <I.Locate />
      </button>

      <div id="hint" className={showHint ? 'show' : ''}>
        <span>
          Tap a circle to add <b>parents, a partner, siblings or children</b>.
        </span>
        <button className="hclose" aria-label="Dismiss" onClick={dismissHint}>
          <I.X />
        </button>
      </div>

      <PersonPanel
        tree={tree}
        person={panelPerson}
        onClose={closePanel}
        onEdit={onEdit}
        onAction={onAction}
        onPickPhoto={pickPhoto}
      />

      {cropSrc && (
        <Cropper
          src={cropSrc.src}
          onCancel={() => setCropSrc(null)}
          onApply={(url) => {
            onEdit(cropSrc.personId, { photo: url });
            setCropSrc(null);
            say('Photo updated');
          }}
        />
      )}

      <div id="toast" role="status" aria-live="polite" className={toastOn ? 'show' : ''}>
        {toast}
      </div>

      {showBegin && (
        <div id="begin" className={beginHiding ? 'hide' : ''}>
          <div className="bx">
            <div className="star">✦</div>
            <h2>Every family has a story</h2>
            <p>
              Yours begins with you. Tap your circle to add parents, a partner, brothers and
              sisters, or children — and trace each branch as far as memory will take you.
            </p>
            <button className="go" onClick={begin}>
              Begin your journey
            </button>
          </div>
        </div>
      )}
    </>
  );
}
