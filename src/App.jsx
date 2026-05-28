import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './index.css'
import './styles/theme.css'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import CompanyProfile from './pages/CompanyProfile'
import EmployeeProfile from './pages/EmployeeProfile'
import AddReview from './pages/AddReview'
import AddEmpReview from './pages/AddEmpReview'
import RegisterCompany from './pages/RegisterCompany'
import RegisterEmployee from './pages/RegisterEmployee'
import PublicProfile from './pages/PublicProfile'
import BottomNav from './components/BottomNav'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [params, setParams] = useState({})

  function navigate(to, p = {}) {
    setScreen(to)
    setParams(p)
    window.scrollTo(0, 0)
  }

  const screenProps = { navigate, params }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Routes>
        {/* Public profile page — trustdubai.ae/[slug] */}
        <Route path="/:slug" element={<PublicProfile />} />

        {/* Main SPA */}
        <Route path="/" element={
          <div style={{ paddingBottom: 64 }}>
            {screen === 'home' && <Home {...screenProps} />}
            {screen === 'search' && <SearchResults {...screenProps} />}
            {screen === 'company' && <CompanyProfile {...screenProps} />}
            {screen === 'employee' && <EmployeeProfile {...screenProps} />}
            {screen === 'add-review' && <AddReview {...screenProps} />}
            {screen === 'add-emp-review' && <AddEmpReview {...screenProps} />}
            {screen === 'register-company' && <RegisterCompany {...screenProps} />}
            {screen === 'register-employee' && <RegisterEmployee {...screenProps} />}
            <BottomNav screen={screen} navigate={navigate} />
          </div>
        } />
      </Routes>
    </div>
  )
}
