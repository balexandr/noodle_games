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

function RatingStars({ avg, count, myRating, onRate }) {
  const [hovered, setHovered] = useState(0)

  const handleClick = (value, e) => {
    e.preventDefault()
    e.stopPropagation()
    onRate(value)
  }

  // Only fills to the visitor's own hover/submitted rating, never the
  // aggregate average — filling stars to `avg` here would make a visitor
  // who's never rated look like they already gave it 5 stars.
  const displayValue = hovered || myRating || 0

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
