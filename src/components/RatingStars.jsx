import { useState } from 'react'
import './RatingStars.css'

function Star({ filled, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button
      type="button"
      className={`rating-stars__star ${filled ? 'rating-stars__star--filled' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label="Rate"
    >
      ★
    </button>
  )
}

function RatingStars({ avg, count, onRate }) {
  const [hovered, setHovered] = useState(0)

  const handleClick = (value, e) => {
    e.preventDefault()
    e.stopPropagation()
    onRate(value)
  }

  // Resting state shows the community average (rounded to a whole star) so
  // a visitor gets an at-a-glance read on the score without hunting for the
  // text summary. Hovering — about to submit your own rating — temporarily
  // replaces that with a live preview of the value under the cursor, and an
  // unrated game just shows empty stars.
  const displayValue = hovered || (count > 0 ? Math.round(avg) : 0)

  return (
    <div
      className="rating-stars"
      onClick={(e) => e.preventDefault()}
      onMouseLeave={() => setHovered(0)}
    >
      <div className="rating-stars__control">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            filled={value <= displayValue}
            onClick={(e) => handleClick(value, e)}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => {}}
          />
        ))}
      </div>
      <span className="rating-stars__summary">
        {count ? `${avg.toFixed(1)} (${count})` : 'Be the first to rate'}
      </span>
    </div>
  )
}

export default RatingStars
