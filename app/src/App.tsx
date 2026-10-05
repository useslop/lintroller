import { Link, usePath } from './router';
import { SessionProvider } from './session';
import { PRODUCT_NAME } from './product';
import { Landing } from './pages/Landing';
import { Import } from './pages/Import';
import { Review } from './pages/Review';
import { Summary } from './pages/Summary';
import { About, HowToExport, NotFound, Privacy } from './pages/Static';

function pageFor(path: string) {
  switch (path.replace(/\/+$/, '') || '/') {
    case '/': return <Landing />;
    case '/sweep': return <Import />;
    case '/sweep/review': return <Review />;
    case '/sweep/summary': return <Summary />;
    case '/how-to-export': return <HowToExport />;
    case '/privacy': return <Privacy />;
    case '/about': return <About />;
    default: return <NotFound />;
  }
}

function Shell() {
  const path = usePath();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <Link to="/" className="brand">{PRODUCT_NAME}</Link>
        <nav aria-label="Main">
          <Link to="/sweep">Start</Link>
          <Link to="/how-to-export">How to export</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>{pageFor(path)}</main>
      <footer className="foot">
        <p>Free. Your file never leaves your device. <Link to="/privacy">Check it yourself</Link>.</p>
      </footer>
    </>
  );
}

export function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
