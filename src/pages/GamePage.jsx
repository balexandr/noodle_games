import { useParams, Link } from 'react-router-dom'
import { games } from '../data/games'
import { OddOneOutIcon, SequenceIcon, ChainLinkIcon, ZeroInIcon, KnotIcon } from '../components/GameIcons'
import './GamePage.css'

const pageIconComponents = {
  'odd-one-out': OddOneOutIcon,
  'sequence':    SequenceIcon,
  'chain-link':  ChainLinkIcon,
  'zero-in':     ZeroInIcon,
  'knot':        KnotIcon,
}

function PageIcon({ id, size }) {
  const Icon = pageIconComponents[id];
  return Icon ? <Icon size={size} /> : null;
}

function GamePage() {
  const { gameId } = useParams()
  const game = games.find(g => g.id === gameId)

  if (!game) {
    return (
      <div className="container game-page">
        <h1>Game not found</h1>
        <Link to="/" className="btn btn--primary">Back to Home</Link>
      </div>
    )
  }

  return (
    <div className="game-page">
      <div className="container">
        <div className="game-page__header">
          <Link to="/" className="game-page__back">← Back</Link>
          <div className="game-page__title-row">
            <span className="game-page__icon">
              {pageIconComponents[game.id]
                ? <PageIcon id={game.id} size={48} />
                : game.icon}
            </span>
            <h1 className="game-page__title">{game.title}</h1>
          </div>
          <p className="game-page__desc">{game.description}</p>
        </div>
        <div className="game-page__canvas">
          {gameId === 'sequence' ? (
            <SequenceGame />
          ) : (
            <div className="game-page__placeholder">
              <p>This game is coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SequenceGame() {
  return (
    <div className="sequence-placeholder">
      <div className="sequence-placeholder__content">
        <h2>🔢 Sequence</h2>
        <p>The Sequence game will be loaded here.</p>
        <p className="sequence-placeholder__hint">Game integration coming next!</p>
      </div>
    </div>
  )
}

export default GamePage
