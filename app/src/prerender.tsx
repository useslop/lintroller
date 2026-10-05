// Server-side render of the static pages. scripts/prerender.mjs loads this through Vite's SSR loader.
import { renderToString } from 'react-dom/server';
import { App } from './App';

export function renderPage(path: string): string {
  return renderToString(<App path={path} />);
}
