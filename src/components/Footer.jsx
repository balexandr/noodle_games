import { Link } from 'react-router-dom'
import './Footer.css'
import { NoodleLogoIcon } from './NoodleLogo'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span className="footer-logo">
          <NoodleLogoIcon size={22} /> NoodleGames
        </span>
        <p className="footer-tagline">Fresh games, served daily.</p>
        <Link to="/privacy" className="footer-privacy-link">Privacy Policy</Link>
        <p className="footer-copyright">© {new Date().getFullYear()} NoodleGames. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
