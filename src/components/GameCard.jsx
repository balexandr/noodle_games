import './GameCard.css'
import { OddOneOutIcon, SequenceIcon, ChainLinkIcon, ZeroInIcon, KnotIcon, PathwaysIcon, SproutIcon, MirrorIcon, RealmIcon, SquintIcon, TandemIcon } from './GameIcons'
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
}

function GameCard({ game, rating, onRate }) {
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
          myRating={rating?.mine ?? 0}
          onRate={(value) => onRate(game.id, value)}
        />
      )}
    </div>
  )
}

export default GameCard
