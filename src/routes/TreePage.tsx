import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Person } from '../model/types';
import {
  addChild,
  addParent,
  addPartner,
  addSibling,
  freshTree,
  generationSpan,
  removePerson,
} from '../model/tree';
import { displayName } from '../model/people';
import { entriesForPerson, newEntry } from '../model/logbook';
import { toGedcom } from '../model/gedcom';
import { makeBackup, parseBackup } from '../model/backup';
import { HINT_KEY } from '../model/persistence';
import { useApp, useTree } from '../store/app';
import { toast } from '../store/toast';
import { useUi } from '../store/ui';
import { appUrl } from '../lib/supabase';
import { download, pickFile, readAsDataUrl } from '../lib/media';
import { AppHeader } from '../components/AppHeader';
import { TreeCanvas, useTreeCanvas } from '../components/TreeCanvas';
import { PersonPanel, type PanelAction, type PanelTab } from '../components/PersonPanel';
import { SearchPalette } from '../components/SearchPalette';
import { Cropper } from '../components/Cropper';
import { Menu } from '../components/Menu';
import * as I from '../components/Icons';

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
  const { apply, edit, undo, redo, upsertEntry, replaceAll } = useApp.getState();
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

  const people = Object.keys(tree.people).length;
  const gens = useMemo(() => generationSpan(tree), [tree]);
  const entryList = useMemo(() => Object.values(entries), [entries]);

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

  const onAction = (id: string, a: PanelAction) => {
    let c;
    if (a === 'father') c = addParent(tree, id, 'male');
    else if (a === 'mother') c = addParent(tree, id, 'female');
    else if (a === 'partner') c = addPartner(tree, id);
    else if (a === 'sibling') c = addSibling(tree, id);
    else if (a === 'child') c = addChild(tree, id);
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
        <div className="zoom" role="group" aria-label="Zoom">
          <button aria-label="Zoom out" onClick={() => setScale(scale - 0.1)}>
            −
          </button>
          <div className="lvl">{Math.round(scale * 100)}%</div>
          <button aria-label="Zoom in" onClick={() => setScale(scale + 0.1)}>
            +
          </button>
        </div>
        <Menu
          label="More actions"
          className="btn subtle icon"
          button={<I.More />}
          items={[
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
            { label: 'Start over', icon: <I.Trash />, danger: true, onSelect: startOver },
          ]}
        />
      </AppHeader>

      <TreeCanvas canvas={canvas} tree={tree} focusId={focusId} onOpen={open} onToggle={onToggle} />

      <div className="hud" aria-live="polite">
        <div className="stat">
          <I.User width={15} height={15} />
          <b>{people}</b> {people === 1 ? 'person' : 'people'}
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
        onClose={() => setPanelId(null)}
        onEdit={onEdit}
        onAction={onAction}
        onPickPhoto={pickPhoto}
        onJump={(id) => {
          open(id);
          setFocusId(id);
        }}
        onNewEntry={newEntryFor}
      />

      <SearchPalette
        tree={tree}
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
