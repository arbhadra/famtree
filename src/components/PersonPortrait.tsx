import type { Person } from '../model/types';
import type { Portrait } from '../model/age';
import { Avatar, MourningRibbon } from './Avatar';

/** A person's photo, or a default portrait chosen by gender and life stage. */
export function PersonPortrait({ person, portrait }: { person: Person; portrait?: Portrait }) {
  const deceased = !!person.died.trim();
  return (
    <>
      <div className={`pic${deceased ? ' faded' : ''}`}>
        {person.photo ? (
          <img src={person.photo} alt="" />
        ) : (
          <Avatar stage={portrait?.stage ?? 'adult'} gender={person.gender} />
        )}
      </div>
      {deceased && (
        <span className="ribbon-wrap" title="Deceased">
          <MourningRibbon />
        </span>
      )}
    </>
  );
}
