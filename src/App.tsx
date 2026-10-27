import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './store/app';
import { Landing } from './routes/Landing';
import { TreePage } from './routes/TreePage';
import { LogbookIndex } from './routes/LogbookIndex';
import { TimelinePage } from './routes/TimelinePage';
import { SharedTree } from './routes/SharedTree';
import { ChartsPage } from './routes/ChartsPage';
import { CreditsPage } from './routes/CreditsPage';
import { AuthDialog } from './components/AuthDialog';
import { Toast } from './components/Toast';
import * as I from './components/Icons';

// The entry page carries the rich-text editor; load it on demand.
const LogEntryPage = lazy(() =>
  import('./routes/LogEntryPage').then((m) => ({ default: m.LogEntryPage })),
);

const TITLES: [RegExp, string][] = [
  [/^\/tree/, 'Your tree'],
  [/^\/logbook\/./, 'Logbook entry'],
  [/^\/logbook/, 'The Logbook'],
  [/^\/timeline/, 'Timeline'],
  [/^\/charts/, 'Family charts'],
  [/^\/credits/, 'Thanks & credits'],
  [/^\/shared/, 'Shared tree'],
];

function TitleAndScroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    const t = TITLES.find(([re]) => re.test(pathname))?.[1];
    document.title = t ? `${t} · Family Tree` : 'Family Tree — chronicle your lineage';
    if (!pathname.startsWith('/tree')) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <I.Crest width={72} height={84} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <main className="page-main">
        <div className="empty-state folio-lite">
          <h2>This page is lost to history</h2>
          <Link className="btn primary" to="/">
            Return home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const ready = useApp((s) => s.ready);
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <TitleAndScroll />
      <div className="ambient" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      {ready ? (
        <Suspense fallback={<Splash />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/tree" element={<TreePage />} />
            <Route path="/logbook" element={<LogbookIndex />} />
            <Route path="/logbook/:id" element={<LogEntryPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/shared/:token" element={<SharedTree />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      ) : (
        <Splash />
      )}
      <AuthDialog />
      <Toast />
    </BrowserRouter>
  );
}
