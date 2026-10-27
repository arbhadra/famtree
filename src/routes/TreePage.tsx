import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Change, ParentLink, Person, Union } from '../model/types';
import {
  addChild,
  addParent,
  addPartner,
  addSibling,
  freshTree,
  generationSpan,
  removePerson,
  setParentLink,
  setUnion,
} from '../model/tree';
import { displayName } from '../model/people';
import { VIEW_LABELS, type ViewMode } from '../model/view';
import { useFamilyMap } from '../hooks/useFamilyMap';
import { entriesForPerson, newEntry } from '../model/logbook';
import { toGedcom } from '../model/gedcom';
import { makeBackup, parseBackup } from '../model/backup';
import { fromCsv, toCsv } from '../model/csv';
import { HINT_KEY } from '../model/persistence';
import { useApp, useTree } from '../store/app';
import { toast } from '../store/toast';
import { useUi } from '../store/ui';
import { appUrl } from '../lib/supabase';
import { download, pickFile, readAsDataUrl } from '../lib/media';
import { AppHeader } from '../components/AppHeader';
import { TreeCanvas, useTreeCanvas } from '../components/TreeCanvas';
import { PersonPanel, type PanelTab, type Relate } from '../components/PersonPanel';
import { SearchPalette } from '../components/SearchPalette';
import { Cropper } from '../components/Cropper';
import { Menu } from '../components/Menu';
import * as I from '../components/Icons';

const VIEW_KEY = 'ft_view';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function TreePage() {
  const tree = useTree();
  const entries = useApp((s) => s.entries);
  const user = useApp((s) => s.user);
  const repo = useApp((s) => s.repo);
  const saveState = useApp((s) => s.saveState);
  const canUndo = useApp((s) => s.history.past.length > 0);
  const canRedo = useApp((s) => s.history.future.length > 0);
  const { apply, change, edit, undo, redo, upsertEntry, replaceAll } = useApp.getState();
  const openAuth = useUi((s) => s.openAuth);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const canvas = useTreeCanvas();
  const { scale, setScale, centerOn } = canvas;
  const [panelId, setPanelId] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('details');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [cropFor, setCropFor] = useState<{ src: string; id: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try {
      return !localStorage.getItem(HINT_KEY);
    } catch {
      return false;
    }
  });

  const [view, setView] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'everyone';
    } catch {
      return 'everyone';
    }
  });
  const map = useFamilyMap(tree, view);

  const people = Object.keys(tree.people).length;
  const shown = map.visible.size;
  const gens = useMemo(() => generationSpan(tree), [tree]);
  const entryList = useMemo(() => Object.values(entries), [entries]);

  const chooseView = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage blocked */
    }
  };

  /* ----- first paint: centre, deep-link focus, first-visit hint ----- */
  useEffect(() => {
    const focus = params.get('focus');
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (focus && tree.people[focus]) {
          centerOn(focus);
          setPanelId(focus);
          setParams({}, { replace: true });
        } else centerOn(tree.meId);
      }),
    );
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissHint = useCallback(() => {
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* storage blocked */
    }
    setShowHint(false);
  }, []);

  /* ----- generation milestones ----- */
  const [lastGen, setLastGen] = useState(gens);
  if (gens !== lastGen) {
    if (gens > lastGen && gens >= 2) toast(`✦ ${gens} generations of your house recorded`);
    setLastGen(gens);
  }

  /* ----- scroll a new/selected person into view ----- */
  useEffect(() => {
    if (!focusId) return;
    centerOn(focusId, true);
    const t = setTimeout(() => setFocusId(null), 700);
    return () => clearTimeout(t);
  }, [focusId, centerOn]);

  /* ----- keyboard shortcuts ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (mod && !isTyping(e.target) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && !isTyping(e.target) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape' && !searchOpen) {
        if (cropFor) setCropFor(null);
        else setPanelId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, cropFor, searchOpen]);

  /* ----- actions ----- */
  const open = (id: string, relatives = false) => {
    setPanelId(id);
    setTab(relatives ? 'relatives' : 'details');
    setJustAdded(null);
  };

  const onRelate = (id: string, r: Relate) => {
    let c: Change;
    if (r.kind === 'parent') c = addParent(tree, id, r.gender, r.type);
    else if (r.kind === 'partner') c = addPartner(tree, id, r.gender);
    else if (r.kind === 'sibling') c = addSibling(tree, id, r.gender, r.via);
    else if (r.kind === 'child') c = addChild(tree, id, r.withId, r.gender);
    else {
      const p = tree.people[id];
      if (!confirm(`Remove ${displayName(p)}? Anyone connected only through them is removed too.`))
        return;
      c = removePerson(tree, id);
      setPanelId(null);
      apply(c);
      toast('Removed — press Undo to bring them back');
      return;
    }
    if (c.state === tree) {
      toast('That relative is already recorded');
      return;
    }
    // Someone hidden by the current view would vanish on creation; show everyone instead.
    if (view !== 'everyone') chooseView('everyone');
    apply(c);
    dismissHint();
    if (c.message) toast(c.message);
    if (c.focusId) {
      // Guided entry: go straight to the new relative's details with the name field focused.
      setFocusId(c.focusId);
      setPanelId(c.focusId);
      setTab('details');
      setJustAdded(c.focusId);
    }
  };

  const onEdit = (id: string, patch: Partial<Person>) => edit(id, patch);
  const onUnion = (a: string, b: string, patch: Partial<Union>) =>
    change(setUnion(tree, a, b, patch), `union:${a}:${b}:${Object.keys(patch).join()}`);
  const onParentLink = (childId: string, parentId: string, type: ParentLink) =>
    change(setParentLink(tree, childId, parentId, type));
  const onToggle = (id: string, which: 'collapsedUp' | 'collapsedDown') =>
    edit(id, { [which]: !tree.people[id][which] });

  const pickPhoto = async (id: string) => {
    const [file] = await pickFile('image/*');
    if (file) setCropFor({ src: await readAsDataUrl(file), id });
  };

  const newEntryFor = (personId: string) => {
    const e = newEntry({ people: [personId] });
    upsertEntry(e);
    navigate(`/logbook/${e.id}?edit=1`);
  };

  const exportImage = async () => {
    setPanelId(null);
    const prev = scale;
    setScale(1);
    await new Promise((r) => setTimeout(r, 700));
    try {
      const { default: html2canvas } = await import('html2canvas');
      const cv = await html2canvas(canvas.stageRef.current!, {
        backgroundColor: '#0b1530',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      cv.toBlob((b) => b && download('family-tree.png', b));
      toast('Saved your family tree as a picture');
    } catch (err) {
      toast('Export failed: ' + (err as Error).message);
    } finally {
      setScale(prev);
    }
  };

  const share = async () => {
    if (!repo.shareToken) {
      openAuth('signup');
      return;
    }
    try {
      const token = await repo.shareToken();
      const link = appUrl(`shared/${token}`);
      await navigator.clipboard
        .writeText(link)
        .catch(() => prompt('Copy your read-only link:', link));
      toast('Read-only link copied — anyone with it can view your tree');
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const restore = async () => {
    const [file] = await pickFile('application/json,.json');
    if (!file) return;
    try {
      const b = parseBackup(await file.text());
      if (!confirm('Replace your current tree and logbook with this backup?')) return;
      await replaceAll(b.tree, b.entries);
      setPanelId(null);
      requestAnimationFrame(() => centerOn(b.tree.meId));
      toast(`Restored ${Object.keys(b.tree.people).length} people and ${b.entries.length} entries`);
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const importCsv = async () => {
    const [file] = await pickFile('.csv,text/csv,text/plain');
    if (!file) return;
    try {
      const { tree: next, warnings } = fromCsv(await file.text(), tree);
      const n = Object.keys(next.people).length;
      const note = warnings.length
        ? `\n\nNotes:\n• ${warnings.slice(0, 8).join('\n• ')}${warnings.length > 8 ? `\n• …and ${warnings.length - 8} more` : ''}`
        : '';
      if (
        !confirm(
          `Replace your tree with ${n} people from “${file.name}”? Your logbook is kept, and you can undo this.${note}`,
        )
      )
        return;
      // An undoable step, like any other edit.
      apply({ state: next });
      setPanelId(null);
      requestAnimationFrame(() => requestAnimationFrame(() => centerOn(next.meId)));
      toast(
        `Imported ${n} people${warnings.length ? ` (${warnings.length} note${warnings.length > 1 ? 's' : ''})` : ''}`,
      );
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const startOver = async () => {
    if (!confirm('Start over with a blank tree? Your logbook entries are kept. You can undo this.'))
      return;
    const t = freshTree();
    apply({ state: t });
    setPanelId(null);
    setScale(1);
    requestAnimationFrame(() => requestAnimationFrame(() => centerOn(t.meId)));
  };

  const panelPerson = panelId ? (tree.people[panelId] ?? null) : null;
  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? 'Not saved'
        : user
          ? 'Saved to account'
          : 'Saved on this device';

  return (
    <div className="tree-page">
      <AppHeader>
        <button
          className="btn subtle icon"
          aria-label="Find a person (Ctrl+K)"
          title="Find a person (Ctrl+K)"
          onClick={() => setSearchOpen(true)}
        >
          <I.Search />
          <span className="lbl">Find</span>
        </button>
        <div className="btn-group">
          <button
            className="btn subtle icon"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            <I.Undo />
          </button>
          <button
            className="btn subtle icon"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={redo}
          >
            <I.Redo />
          </button>
        </div>
        <label className="view-select" title="Who to show on the map">
          <span className="lbl">Show</span>
          <select
            aria-label="Who to show"
            value={view}
            onChange={(e) => chooseView(e.target.value as ViewMode)}
          >
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
              <option key={v} value={v}>
                {VIEW_LABELS[v]}
              </option>
            ))}
          </select>
        </label>
        <div className="zoom" role="group" aria-label="Zoom">
          <button aria-label="Zoom out" onClick={() => setScale(scale - 0.1)}>
            −
          </button>
          <div className="lvl">{Math.round(scale * 100)}%</div>
          <button aria-label="Zoom in" onClick={() => setScale(scale + 0.1)}>
            +
          </button>
          <button
            className="fit"
            aria-label="Fit everyone on screen"
            title="Fit everyone on screen"
            onClick={() => canvas.fit(map.layout.width, map.layout.height)}
          >
            <I.Expand />
          </button>
        </div>
        <Menu
          label="More actions"
          className="btn subtle icon"
          button={<I.More />}
          items={[
            {
              label: 'Fit everyone on screen',
              icon: <I.Expand />,
              onSelect: () => canvas.fit(map.layout.width, map.layout.height),
            },
            ...(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => ({
              label: `Show: ${VIEW_LABELS[v]}`,
              icon: view === v ? <I.Check /> : <span className="menu-gap" />,
              onSelect: () => chooseView(v),
            })),
            { label: 'Save as image', icon: <I.Download />, onSelect: exportImage },
            {
              label: 'Share read-only link',
              icon: <I.Share />,
              hint: repo.shareToken ? undefined : 'Needs an account',
              onSelect: share,
            },
            {
              label: 'Export GEDCOM',
              icon: <I.FileIcon />,
              hint: 'For other genealogy apps',
              onSelect: () => download('family-tree.ged', toGedcom(tree), 'text/plain'),
            },
            {
              label: 'Download backup',
              icon: <I.Download />,
              hint: 'Tree + logbook as JSON',
              onSelect: () =>
                download(
                  `family-tree-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(makeBackup(tree, entryList), null, 2),
                  'application/json',
                ),
            },
            { label: 'Restore backup…', icon: <I.Upload />, onSelect: restore },
            {
              label: 'Export CSV',
              icon: <I.FileIcon />,
              hint: 'Edit in a spreadsheet or text editor',
              onSelect: () =>
                download(
                  `family-tree-${new Date().toISOString().slice(0, 10)}.csv`,
                  toCsv(tree),
                  'text/csv;charset=utf-8',
                ),
            },
            {
              label: 'Import CSV…',
              icon: <I.Upload />,
              hint: 'Replaces the tree, keeps the logbook',
              onSelect: importCsv,
            },
            { label: 'Start over', icon: <I.Trash />, danger: true, onSelect: startOver },
          ]}
        />
      </AppHeader>

      <TreeCanvas
        canvas={canvas}
        tree={tree}
        layout={map.layout}
        sizes={map.sizes}
        labels={map.labels}
        portraits={map.portraits}
        visible={map.visible}
        focusId={focusId}
        onOpen={open}
        onToggle={onToggle}
      />

      <div className="hud" aria-live="polite">
        <div className="stat">
          <I.User width={15} height={15} />
          <b>{people}</b> {people === 1 ? 'person' : 'people'}
          {shown < people && <small className="hidden-count">({people - shown} hidden)</small>}
        </div>
        <div className="stat">
          <I.TreeMark width={15} height={15} />
          <b>{gens}</b> {gens === 1 ? 'generation' : 'generations'}
        </div>
        <div
          className={`stat save s-${saveState}`}
          title={useApp.getState().saveError || undefined}
        >
          {saveState === 'saving' ? (
            <span className="spinner" />
          ) : (
            <I.Check width={13} height={13} />
          )}
          {saveLabel}
        </div>
      </div>
      <details className="legend">
        <summary>Key</summary>
        <div>
          <span className="sw kin" /> birth child
        </div>
        <div>
          <span className="sw adopted" /> adopted
        </div>
        <div>
          <span className="sw step" /> step · foster · guardian
        </div>
        <div>
          <span className="sw bond" /> <span className="ht">♥</span> partners
        </div>
        <div>
          <span className="sw ex" /> separated · divorced
        </div>
        <div>
          <span className="sw arc" /> partners not side by side
        </div>
      </details>
      <button
        id="locate"
        aria-label="Center on me"
        title="Center on me"
        onClick={() => {
          setScale(1);
          requestAnimationFrame(() => centerOn(tree.meId, true));
        }}
      >
        <I.Locate />
      </button>

      <div id="hint" className={showHint ? 'show' : ''}>
        <span>
          Select a portrait to add <b>parents, a partner, siblings or children</b>.
        </span>
        <button className="hclose" aria-label="Dismiss" onClick={dismissHint}>
          <I.X />
        </button>
      </div>

      <PersonPanel
        tree={tree}
        person={panelPerson}
        tab={tab}
        onTab={setTab}
        autoFocusName={!!panelPerson && panelPerson.id === justAdded}
        entries={panelPerson ? entriesForPerson(entryList, panelPerson.id) : []}
        labels={map.labels}
        computed={map.computed}
        portraits={map.portraits}
        onClose={() => setPanelId(null)}
        onEdit={onEdit}
        onRelate={onRelate}
        onUnion={onUnion}
        onParentLink={onParentLink}
        onPickPhoto={pickPhoto}
        onJump={(id) => {
          open(id);
          setFocusId(id);
        }}
        onNewEntry={newEntryFor}
      />

      <SearchPalette
        tree={tree}
        labels={map.labels}
        portraits={map.portraits}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(id) => {
          setFocusId(id);
          open(id);
        }}
      />

      {cropFor && (
        <Cropper
          src={cropFor.src}
          onCancel={() => setCropFor(null)}
          onApply={(url) => {
            onEdit(cropFor.id, { photo: url });
            setCropFor(null);
            toast('Portrait updated');
          }}
        />
      )}
    </div>
  );
}
