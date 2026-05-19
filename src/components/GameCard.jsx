import './GameCard.css'

function GameCard({ game }) {
  const isActive = game.status === 'active' && game.url

  const card = (
    <div className={`game-card ${isActive ? 'game-card--active' : 'game-card--soon'}`}>
      <div className="game-card__icon">{game.icon}</div>
      <div className="game-card__body">
        <h3 className="game-card__title">{game.title}</h3>
        <p className="game-card__desc">{game.description}</p>
      </div>
      <div className="game-card__tags">
        {game.tags.map(tag => (
          <span key={tag} className={`tag tag--${tag.toLowerCase()}`}>{tag}</span>
        ))}
      </div>
    </div>
  )

  if (isActive) {
    return (
      <a href={game.url} target="_blank" rel="noopener noreferrer" className="game-card-link">
        {card}
      </a>
    )
  }

  return card
}

export default GameCard
