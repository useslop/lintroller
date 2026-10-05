// A few lines of History API routing. No library, no server: the static shell serves every route.
import { createContext, useContext, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

// Set only when rendering a fixed path on the server (prerender). In the browser the live location is used.
const FixedPath = createContext<string | null>(null);

export function FixedPathProvider({ path, children }: { path: string | null; children: ReactNode }) {
  return <FixedPath.Provider value={path}>{children}</FixedPath.Provider>;
}

const NAV_EVENT = 'subsweep:navigate';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

export function usePath(): string {
  const fixed = useContext(FixedPath);
  const live = useSyncExternalStore(subscribe, () => window.location.pathname, () => fixed ?? '/');
  return fixed ?? live;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (options.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
