import { Link } from 'react-router-dom';
import './Privacy.css';

const GAME_DOMAINS = [
  'mirror.noodlegames.co',
  'sequence.noodlegames.co',
  'oddoneout.noodlegames.co',
  'chainlink.noodlegames.co',
  'zeroin.noodlegames.co',
  'knot.noodlegames.co',
  'pathways.noodlegames.co',
  'sprout.noodlegames.co',
  'realm.noodlegames.co',
];

export default function Privacy() {
  const updated = 'August 24, 2026';

  return (
    <div className="privacy">
      <div className="privacy-inner">
        <Link to="/" className="privacy-back">← Back to NoodleGames</Link>
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated: {updated}</p>

        <p>
          This policy covers NoodleGames.co and every game subdomain listed
          below — they're one project, run by one person, and this is the
          only privacy policy across all of them.
        </p>
        <ul className="privacy-domain-list">
          <li>noodlegames.co (this site)</li>
          {GAME_DOMAINS.map((d) => <li key={d}>{d}</li>)}
        </ul>

        <h2>The short version</h2>
        <p>
          There's no account to make and nothing to sign up for. Nobody's
          name, email, or identity is ever collected. What's stored is
          strictly local gameplay bookkeeping (today's puzzle progress,
          your streak) plus one small cookie that lets the "share all"
          button on each game know which other games you've already
          finished today. If ads or analytics get added later, this page
          will say so — nothing runs today beyond what's described below.
        </p>

        <h2>What's stored, and where</h2>
        <p>
          <strong>localStorage (per game, stays on your device):</strong>{' '}
          each game saves its own puzzle progress and stats — streak,
          best time, win rate, etc. — in your browser's localStorage.
          This never leaves your device and is never sent to us or
          anyone else; it's just how the game remembers you between
          visits, the same way it would on any device that supported no
          accounts at all.
        </p>
        <p>
          <strong>One cross-game cookie:</strong> because each game lives
          on its own subdomain, we use a single cookie scoped to{' '}
          <code>.noodlegames.co</code> so the "Share all completed" button
          on any game can tell how many of today's puzzles you've
          finished across the others. It stores only a game id, a date,
          and the plain-text result you'd already be sharing yourself
          (e.g. "Mirror #5 🔦 1/5") — no identity, no cross-site tracking
          beyond this one family of games, and it expires automatically
          after 2 days.
        </p>

        <h2>Ads and analytics</h2>
        <p>
          None of these sites run ads or third-party analytics as of the
          date above. If that changes — for example, by joining Google
          AdSense — this page will be updated first, and this section
          will name exactly which service is running and link to that
          service's own privacy policy and opt-out tools (for Google
          specifically, that's{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            Google Ads Settings
          </a>{' '}
          and{' '}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            how Google uses information from sites that use its services
          </a>
          ). Services like that typically use cookies to show relevant
          ads based on your visits here and elsewhere — you're able to
          opt out of personalized ads through your browser and through
          Google's own settings regardless.
        </p>

        <h2>Children's privacy</h2>
        <p>
          These games aren't directed at children under 13, and no
          personal information is knowingly collected from anyone,
          child or adult — there's simply nowhere on these sites to enter
          any.
        </p>

        <h2>Your choices</h2>
        <p>
          Clearing your browser's cookies and site data for
          noodlegames.co (and its subdomains) removes everything
          described on this page — streaks, stats, and the shared
          cookie — instantly and completely, since none of it exists
          anywhere except your own browser.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If what's collected or how it's used ever changes, this page
          gets updated and the date at the top moves — there's no
          separate mailing list to notify since there's no email
          collected to notify anyone at.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy or these games are welcome via the{' '}
          <a href="https://github.com/balexandr" target="_blank" rel="noopener noreferrer">
            GitHub profile
          </a>{' '}
          these projects are published under.
        </p>
      </div>
    </div>
  );
}
