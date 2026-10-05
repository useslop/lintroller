import { cancelDirectory } from '../data';
import { Link, navigate } from '../router';
import { useSession } from '../session';
import { formatDate } from '../copy';

export function Landing() {
  const session = useSession();
  const latestCheck = cancelDirectory
    .map((entry) => entry.verified)
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1);
  return (
    <section className="hero">
      <h1>Find the charges that keep coming back.</h1>
      <p className="lede">
        Drop in a CSV from your bank or card. See what repeats, what it costs per year, and where to cancel.
        Free. Your file never leaves your device.
      </p>
      <ul className="points">
        <li>Made for CSVs from Bank of America, Chase, Wells Fargo, Citi, Capital One, Amex, Discover, US Bank, Apple Card and PayPal. Other CSVs work when you pick the columns.</li>
        <li>Shows the dates and amounts behind each match, so you decide.</li>
        <li>Links only to the company's own cancel page{latestCheck ? `, checked on ${formatDate(latestCheck)}` : ''}.</li>
      </ul>
      <p className="actions">
        <Link to="/sweep" className="button primary">Start</Link>
        <Link to="/privacy" className="button">Prove it: what runs where</Link>
      </p>
      {session.savedAvailable && (
        <p>
          <button
            type="button"
            className="link"
            onClick={() => {
              session.openSaved();
              navigate('/sweep/review');
            }}
          >
            Open your saved review
          </button>{' '}
          (from an earlier visit, on this device)
        </p>
      )}
    </section>
  );
}
