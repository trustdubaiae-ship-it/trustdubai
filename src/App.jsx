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

// Standalone /claim-company route wrapper.
// Provides a navigate() that maps internal "screen" names to URL navigation,
// and reads ?slug= so the claim form auto-selects the listed company.
function ClaimCompanyPage() {
  let slug = ''
  try { slug = new URLSearchParams(window.location.search).get('slug') || '' } catch (e) {}
  function navigate(to) {
    if (to === 'home') window.location.href = '/'
    else window.location.href = '/?screen=' + encodeURIComponent(to)
  }
  return <ClaimCompany navigate={navigate} prefillSlug={slug} />
}

export default function App() {
  // Initial screen can be deep-linked via /?screen=register-company etc.
  const [screen, setScreen] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('screen') || 'home' } catch (e) { return 'home' }
  })
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
        <Route path="/claim-company" element={<ClaimCompanyPage />} />
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
