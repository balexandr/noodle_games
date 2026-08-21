import { useEffect } from 'react'
import GameCard from '../components/GameCard'
import { ToiletIcon, JoystickIcon, RocketIcon } from '../components/FeatureIcons'
import { games } from '../data/games'
import './Home.css'

// Injected client-side (not baked into index.html) so it can never drift out
// of sync with `games` the way a hand-written JSON-LD blob in the HTML
// would the next time a game gets added or retired. Google's crawler runs
// JS and picks up script tags added this way, same as it does for the
// visible content on this SPA — this isn't a new assumption for this site.
function useStructuredData(gameList) {
  useEffect(() => {
    const active = gameList.filter((g) => g.status === 'active')
    const scripts = [
      {
        id: 'ld-website',
        data: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'NoodleGames',
          url: 'https://noodlegames.co/',
          description: 'A new puzzle every day, free in your browser — word games, logic puzzles, and brain teasers.',
        },
      },
      {
        id: 'ld-gamelist',
        data: {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: active.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'VideoGame',
              name: g.title,
              description: g.description,
              url: g.url,
              genre: g.tags,
              applicationCategory: 'Game',
              operatingSystem: 'Any (Web Browser)',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            },
          })),
        },
      },
    ]

    const created = scripts.map(({ id, data }) => {
      let el = document.getElementById(id)
      const isNew = !el
      if (isNew) {
        el = document.createElement('script')
        el.type = 'application/ld+json'
        el.id = id
        document.head.appendChild(el)
      }
      el.textContent = JSON.stringify(data)
      return { el, isNew }
    })

    return () => {
      created.forEach(({ el, isNew }) => { if (isNew) el.remove() })
    }
  }, [gameList])
}

function Home() {
  const todaysGame = games.findLast(g => g.status === 'active') || games.find(g => g.status === 'active')
  useStructuredData(games)

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero__content">
            <h1 className="hero__title">
              Fresh games,<br />
              <span className="hero__highlight">served daily.</span>
            </h1>
            <p className="hero__subtitle">
              Quick, fun mini games you can play every day. No downloads, no accounts – just play.
            </p>
            <a href={todaysGame.url} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              Jump In &amp; Play
            </a>
          </div>
          <div className="hero__doodles">
            <span className="doodle doodle--1">✦</span>
            <span className="doodle doodle--2">〰️</span>
            <span className="doodle doodle--3">✶</span>
            <span className="doodle doodle--4">↯</span>
            <span className="doodle doodle--5">◐</span>
          </div>
        </div>
      </section>

      {/* Daily Challenge */}
      <section className="daily">
        <div className="container">
          <div className="daily__card">
            <div className="daily__badge">TODAY'S CHALLENGE</div>
            <div className="daily__info">
              <h2 className="daily__title">{todaysGame.title}</h2>
              <p className="daily__desc">{todaysGame.description}</p>
            </div>
            <a href={todaysGame.url} target="_blank" rel="noopener noreferrer" className="btn btn--play">
              <span className="btn__play-icon">▶</span> Play Now
            </a>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section id="games" className="games">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">All Games</h2>
            <p className="section-subtitle">Pick a game, any game.</p>
          </div>
          <div className="games__grid">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="about">
        <div className="container">
          <h2 className="section-title">Why "Noodle"?</h2>
          <p className="about__intro">
            Because you're using your noodle. These are the games you play when you're on the toilet, waiting for coffee, or pretending to work. No logins. No ads. No guilt. Just a couple minutes of your brain doing something fun.
          </p>
          <div className="about__features">
            <div className="feature">
              <span className="feature__icon"><ToiletIcon /></span>
              <h3>Toilet-length</h3>
              <p>Every game is designed to finish before your legs go numb.</p>
            </div>
            <div className="feature">
              <span className="feature__icon"><JoystickIcon /></span>
              <h3>Actually fun</h3>
              <p>Not "educational game" fun. Real fun. The kind where you accidentally play 3 rounds.</p>
            </div>
            <div className="feature">
              <span className="feature__icon"><RocketIcon /></span>
              <h3>New stuff regularly</h3>
              <p>We keep building weird little games. They show up here when they're ready.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
