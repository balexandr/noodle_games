import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span className="footer-logo">🍜 NoodleGames</span>
        <p className="footer-tagline">Fresh games, served daily.</p>
        <p className="footer-copyright">© {new Date().getFullYear()} NoodleGames. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
