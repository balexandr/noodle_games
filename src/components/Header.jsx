import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <span className="logo-icon">🍜</span>
          <span className="logo-text">NoodleGames</span>
        </Link>
        <nav className="nav">
          <a href="#games" className="nav-link">Games</a>
          <a href="#about" className="nav-link">About</a>
        </nav>
      </div>
    </header>
  )
}

export default Header
