import './GameCard.css'
import { OddOneOutIcon, SequenceIcon, ChainLinkIcon, ZeroInIcon, KnotIcon, PathwaysIcon, SproutIcon, MirrorIcon, RealmIcon, SquintIcon, TandemIcon, DialIcon, WeaveIcon } from './GameIcons'
import RatingStars from './RatingStars'

const iconComponents = {
  'odd-one-out': OddOneOutIcon,
  'sequence':    SequenceIcon,
  'chain-link':  ChainLinkIcon,
  'zero-in':     ZeroInIcon,
  'knot':        KnotIcon,
  'pathways':    PathwaysIcon,
  'sprout':      SproutIcon,
  'mirror':      MirrorIcon,
  'realm':       RealmIcon,
  'squint':      SquintIcon,
  'tandem':      TandemIcon,
  'dial':        DialIcon,
  'weave':       WeaveIcon,
}

function GameCard({ game, rating, onRate, leader }) {
  const isActive = game.status === 'active' && game.url
  const IconComponent = iconComponents[game.id]

  const body = (
    <>
      <div className="game-card__icon">
        {IconComponent ? <IconComponent /> : game.icon}
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title">{game.title}</h3>
        <p className="game-card__desc">{game.description}</p>
      </div>
      {leader && (
        <div className="game-card__leader">
          <svg className="game-card__leader-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M7 5H4.5A2.5 2.5 0 0 0 5 10h2M17 5h2.5A2.5 2.5 0 0 1 19 10h-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M12 14v3.5M9 21h6M10 17.5h4l.6 3.5H9.4l.6-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          <span className="game-card__leader-text">
            #1 today: <strong>{leader.initials}</strong> &middot; {leader.score_display}
          </span>
        </div>
      )}
      <div className="game-card__tags">
        {game.tags.map(tag => (
          <span key={tag} className={`tag tag--${tag.toLowerCase()}`}>{tag}</span>
        ))}
      </div>
    </>
  )

  return (
    <div className={`game-card ${isActive ? 'game-card--active' : 'game-card--soon'}`}>
      {isActive ? (
        <a href={game.url} target="_blank" rel="noopener noreferrer" className="game-card__link">
          {body}
        </a>
      ) : (
        body
      )}
      {isActive && (
        <RatingStars
          avg={rating?.avg ?? 0}
          count={rating?.count ?? 0}
          onRate={(value) => onRate(game.id, value)}
        />
      )}
    </div>
  )
}

export default GameCard
