import './Footer.css'
import { NoodleLogoIcon } from './NoodleLogo'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          <NoodleLogoIcon size={22} />NoodleGames</span>
        <p className="footer-tagline">Fresh games, served daily.</p>
        <p className="footer-copyright">© {new Date().getFullYear()} NoodleGames. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
