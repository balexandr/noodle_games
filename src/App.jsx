import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Privacy from './pages/Privacy'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Logout from './pages/Logout'
import Profile from './pages/Profile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="login" element={<Login />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="logout" element={<Logout />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
