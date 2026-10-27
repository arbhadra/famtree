import { useEffect, useState } from 'react';
import type { MediaRef } from '../model/types';
import { useApp } from '../store/app';

/** Resolve a stored media reference to a displayable URL (signed URL for cloud files). */
export function useMediaUrl(ref: MediaRef | undefined): string {
  const repo = useApp((s) => s.repo);
  const inline = ref?.kind === 'inline' ? ref.dataUrl : '';
  const path = ref?.kind === 'storage' ? ref.path : '';
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!path) return;
    let live = true;
    repo
      .resolveMedia({ kind: 'storage', path })
      .then((u) => live && setUrl(u))
      .catch(() => live && setUrl(''));
    return () => {
      live = false;
    };
  }, [repo, path]);

  return inline || (path ? url : '');
}
