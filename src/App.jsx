import { useState, useEffect } from 'react'
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
import ClaimCompany from './pages/ClaimCompany'
import PublicProfile from './pages/PublicProfile'
import MyAccount from './pages/MyAccount'
import ServiceArea from './pages/ServiceArea'
import Legal from './pages/Legal'
import Partner from './pages/Partner'
import BottomNav from './components/BottomNav'
import { startSessionTracking } from './sessionTracker'
function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => document.documentElement.clientWidth < 481
  )
  useState(() => {
    function check() {
      setMobile(document.documentElement.clientWidth < 481)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  })
  return mobile
}
export default function App() {
  const [screen, setScreen] = useState('home')
  const [params, setParams] = useState({})
  const isMobile = useIsMobile()

  // Visitor session tracking (Avg Time / Pages-per-visit / Bounce Rate)
  useEffect(() => { startSessionTracking() }, [])

  function navigate(to, p = {}) {
    setScreen(to)
    setParams(p)
    window.scrollTo(0, 0)
  }
  const screenProps = { navigate, params }
  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh' }}>
      <Routes>
        {/* Static / reserved routes — MUST come before the catch-all "/:slug" */}
        <Route path="/terms"   element={<Legal page="terms" />} />
        <Route path="/privacy" element={<Legal page="privacy" />} />
        <Route path="/refund"  element={<Legal page="refund" />} />
        <Route path="/partner" element={<Partner />} />
        <Route path="/services/:serviceArea" element={<ServiceArea />} />
        <Route path="/:slug" element={<PublicProfile />} />
        <Route path="/" element={
          <div style={{ paddingBottom: isMobile ? 64 : 0 }}>
            {screen === 'home'              && <Home {...screenProps} />}
            {screen === 'search'            && <SearchResults {...screenProps} />}
            {screen === 'company'           && <CompanyProfile {...screenProps} />}
            {screen === 'employee'          && <EmployeeProfile {...screenProps} />}
            {screen === 'add-review'        && <AddReview {...screenProps} />}
            {screen === 'add-emp-review'    && <AddEmpReview {...screenProps} />}
            {screen === 'register-company'  && <RegisterCompany {...screenProps} />}
            {screen === 'register-employee' && <RegisterEmployee {...screenProps} />}
            {screen === 'claim-company'     && <ClaimCompany {...screenProps} />}
            {screen === 'customer-profile'  && <MyAccount {...screenProps} />}
            {screen === 'my-requests'       && <MyAccount {...screenProps} />}
            {screen === 'my-account'        && <MyAccount {...screenProps} />}
            {isMobile && <BottomNav screen={screen} navigate={navigate} />}
          </div>
        } />
      </Routes>
    </div>
  )
}
