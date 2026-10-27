import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useApp } from '../store/app';
import { useUi } from '../store/ui';
import { supabase, cloudEnabled } from '../lib/supabase';
import { toast } from '../store/toast';
import { Menu } from './Menu';
import * as I from './Icons';

/** Shared top bar: crest, section tabs, page-specific controls, account, and the logbook (far right). */
export function AppHeader({ children }: { children?: ReactNode }) {
  const user = useApp((s) => s.user);
  const count = useApp((s) => Object.keys(s.entries).length);
  const openAuth = useUi((s) => s.openAuth);
  const initials = (user?.name || user?.email || '?').slice(0, 1).toUpperCase();

  return (
    <header className="app-header">
      <Link to="/" className="brand" aria-label="Family Tree home">
        <span className="mark" aria-hidden="true">
          <I.Crest width={40} height={46} />
        </span>
        <span className="brand-text">
          <span className="brand-name">Family Tree</span>
          <span className="brand-sub">A chronicle of your lineage</span>
        </span>
      </Link>
      <nav className="tabs" aria-label="Sections">
        <NavLink to="/tree" className="tab">
          <I.TreeMark width={16} height={16} />
          <span>Tree</span>
        </NavLink>
        <NavLink to="/timeline" className="tab">
          <I.Hourglass width={16} height={16} />
          <span>Timeline</span>
        </NavLink>
      </nav>
      <div className="header-tools">{children}</div>

      {user ? (
        <Menu
          label="Account"
          className="avatar"
          button={<span aria-hidden="true">{initials}</span>}
          header={
            <>
              <b>{user.name}</b>
              <small>{user.email}</small>
            </>
          }
          items={[
            {
              label: 'Sign out',
              icon: <I.LogOut />,
              onSelect: async () => {
                await supabase?.auth.signOut();
                toast('Signed out — you are back on this device’s tree');
              },
            },
          ]}
        />
      ) : (
        <button
          className="btn subtle signin-btn"
          onClick={() => openAuth('signin')}
          title={cloudEnabled ? 'Sign in to save your tree to your account' : 'Accounts'}
        >
          <I.User width={16} height={16} />
          <span className="lbl">Sign in</span>
        </button>
      )}

      <NavLink
        to="/logbook"
        className="logbook-btn"
        aria-label={`Logbook, ${count} entries`}
        title="Logbook"
      >
        <I.Book />
        <span className="lbl">Logbook</span>
        {count > 0 && <span className="badge">{count > 99 ? '99+' : count}</span>}
      </NavLink>
    </header>
  );
}
