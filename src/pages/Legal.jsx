import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/* ============================================================================
   Quvera — Legal pages (Terms / Privacy / Refund)
   One component, rendered by 3 routes via the `page` prop.
   Real operating-entity details filled in (RenoFix Plus Technical Contracting L.L.C).
============================================================================ */
const LEGAL = {
  entity:    'RenoFix Plus Technical Contracting L.L.C',  // registered legal entity operating Quvera
  brand:     'Quvera',                                 // platform / brand name
  license:   '1585059',                                    // DET trade licence number
  register:  '2776638',                                    // commercial register number
  chamber:   '684850',                                     // Dubai Chamber membership number
  authority: 'Dubai Department of Economy & Tourism (DET)',
  address:   'Office G-02-38, Al Khabaisi, Deira, Dubai, United Arab Emirates',
  email:     'support@quvera.ae',                      // official platform support email
  phone:     '+971 54 446 0966',                           // support phone / WhatsApp
  site:      'quvera.ae',
  effective: '9 June 2026',
}

function makeTheme(dark) {
  if (dark) return {
    dark: true,
    bg: 'radial-gradient(1200px 600px at 6% -8%, rgba(59,143,212,0.18), transparent 58%), radial-gradient(1000px 640px at 102% 2%, rgba(167,139,250,0.16), transparent 55%), #070b15',
    card: 'rgba(17,24,40,0.72)', cardSolid: '#0f1626', line: 'rgba(255,255,255,0.08)', soft: 'rgba(255,255,255,0.03)',
    t1: '#eef3fb', t2: '#9aa7bd', t3: '#5d6b7e', accent: '#4f9fe0', grad: 'linear-gradient(135deg,#4f9fe0,#b69bff)',
    shadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 40px rgba(0,0,0,0.35)', blur: 'blur(14px)',
  }
  return {
    dark: false,
    bg: 'radial-gradient(1100px 520px at 8% -6%, rgba(29,111,184,0.10), transparent 60%), radial-gradient(900px 560px at 100% 0%, rgba(139,92,246,0.08), transparent 55%), #e7ecf3',
    card: 'rgba(255,255,255,0.86)', cardSolid: '#ffffff', line: '#e4e9f0', soft: '#f4f7fb',
    t1: '#16233a', t2: '#56657c', t3: '#94a3b8', accent: '#1d6fb8', grad: 'linear-gradient(135deg,#1d6fb8,#8b5cf6)',
    shadow: '0 1px 2px rgba(20,40,80,0.05), 0 10px 34px rgba(20,40,80,0.08)', blur: 'blur(12px)',
  }
}

const TABS = [
  { key: 'terms',   label: 'Terms of Service', path: '/terms' },
  { key: 'privacy', label: 'Privacy Policy',   path: '/privacy' },
  { key: 'refund',  label: 'Refund Policy',    path: '/refund' },
]

export default function Legal({ page = 'terms' }) {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('td_theme') === 'dark' } catch { return false } })
  useEffect(() => { try { localStorage.setItem('td_theme', dark ? 'dark' : 'light') } catch (e) {} }, [dark])
  useEffect(() => { window.scrollTo(0, 0); document.title = (TABS.find(t => t.key === page)?.label || 'Legal') + ' — Quvera' }, [page])

  const TH = makeTheme(dark)
  const F = "'Manrope',sans-serif"

  const Section = ({ n, title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: TH.t1, margin: '0 0 10px', display: 'flex', gap: 9, alignItems: 'baseline' }}>
        {n != null && <span style={{ color: TH.accent, fontSize: 14 }}>{n}.</span>}{title}
      </h2>
      <div style={{ fontSize: 13.5, color: TH.t2, lineHeight: 1.75 }}>{children}</div>
    </div>
  )
  const P = ({ children }) => <p style={{ margin: '0 0 11px' }}>{children}</p>
  const LI = ({ children }) => <li style={{ margin: '0 0 7px' }}>{children}</li>
  const UL = ({ children }) => <ul style={{ margin: '0 0 11px', paddingLeft: 20 }}>{children}</ul>
  const B = ({ children }) => <strong style={{ color: TH.t1, fontWeight: 700 }}>{children}</strong>

  return (
    <div style={{ background: TH.bg, minHeight: '100vh', fontFamily: F, color: TH.t1 }}>
      <style>{`
        .td-legal-tab:hover{ color:${TH.accent} !important; }`}</style>

      {/* NAV */}
      <div style={{ background: TH.dark ? 'rgba(7,11,21,0.7)' : 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${TH.line}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, color: TH.t1 }}>
            <span style={{ background: TH.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Quvera</span>
          </button>
          <button onClick={() => setDark(d => !d)} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${TH.line}`, background: TH.soft, color: TH.t2, cursor: 'pointer', fontSize: 14 }}>{dark ? '☀️' : '🌙'}</button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '26px 18px 60px' }}>
        {/* Title */}
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: TH.t1, margin: '0 0 6px' }}>
          {TABS.find(t => t.key === page)?.label}
        </h1>
        <div style={{ fontSize: 12.5, color: TH.t3, marginBottom: 20 }}>Effective date: {LEGAL.effective}</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, borderBottom: `1px solid ${TH.line}`, paddingBottom: 14 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => navigate(t.path)} className="td-legal-tab"
              style={{ fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${page === t.key ? 'transparent' : TH.line}`,
                background: page === t.key ? TH.grad : TH.soft,
                color: page === t.key ? '#fff' : TH.t2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body card */}
        <div style={{ background: TH.card, backdropFilter: TH.blur, WebkitBackdropFilter: TH.blur, border: `1px solid ${TH.line}`, borderRadius: 16, padding: '22px 22px 8px', boxShadow: TH.shadow }}>

          {/* ============================ TERMS ============================ */}
          {page === 'terms' && (
            <>
              <Section title="Agreement to Terms">
                <P>These Terms of Service ("Terms") govern your access to and use of the {LEGAL.site} website, applications and services (collectively, the "Platform"). The Platform is operated by <B>{LEGAL.entity}</B>, a Limited Liability Company licensed by the {LEGAL.authority} under Trade Licence No. <B>{LEGAL.license}</B> (Commercial Register No. {LEGAL.register}), and is provided under the brand <B>"{LEGAL.brand}"</B> ("we", "us", "our"). By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.</P>
              </Section>

              <Section n="1" title="About Quvera">
                <P>{LEGAL.brand} is a business verification and discovery platform that helps users in Dubai find, review and connect with home-service and other businesses. {LEGAL.brand} is <B>not a party</B> to any agreement, transaction or service performed between a user and a listed business. We do not provide the services advertised by businesses, and we are not responsible for their performance, quality, pricing or conduct.</P>
              </Section>

              <Section n="2" title="Definitions">
                <UL>
                  <LI><B>User / Customer</B> — any person who browses the Platform, submits an enquiry, or posts a review.</LI>
                  <LI><B>Business</B> — any company or service provider that registers, is listed, or subscribes to a plan on the Platform.</LI>
                  <LI><B>Content</B> — reviews, ratings, profiles, documents, images and any other material submitted to the Platform.</LI>
                </UL>
              </Section>

              <Section n="3" title="Eligibility & Accounts">
                <P>You must be at least 18 years old to create an account. You are responsible for keeping your login credentials secure and for all activity under your account. Information you provide must be accurate and kept up to date.</P>
              </Section>

              <Section n="4" title="Customer Terms">
                <UL>
                  <LI><B>Reviews must be genuine.</B> You may only review a business you have genuine experience with. Fake, paid, defamatory, abusive or misleading reviews are prohibited and may be removed.</LI>
                  <LI><B>No guarantee.</B> Verification badges and trust scores are indicative signals based on available data; they are not a guarantee of a business's quality, legality or outcome. Do your own due diligence before engaging any business.</LI>
                  <LI><B>Enquiries.</B> When you submit an enquiry or quote request, your details may be shared with matched businesses so they can contact you (see Privacy Policy).</LI>
                  <LI><B>Conduct.</B> You agree not to misuse the Platform, scrape data, or interfere with its operation.</LI>
                </UL>
              </Section>

              <Section n="5" title="Business Terms">
                <UL>
                  <LI><B>Accurate information.</B> Businesses must provide truthful company details, documents and credentials. Misrepresentation may result in suspension or removal.</LI>
                  <LI><B>Verification.</B> Verification is performed against the documents and records provided. {LEGAL.brand} may approve, reject, request more information, or revoke verification at its discretion.</LI>
                  <LI><B>Free trial &amp; subscriptions.</B> A free trial / demo period may be offered so you can evaluate the paid features before any payment. Paid plans grant access to additional profile features. Plan features, limits and pricing are described at the point of purchase and may change with notice.</LI>
                  <LI><B>Responsibilities.</B> Businesses are solely responsible for the services they offer, their dealings with customers, and compliance with all applicable UAE laws and licences.</LI>
                  <LI><B>Suspension.</B> We may suspend or remove any listing that violates these Terms, receives substantiated complaints, or harms the integrity of the Platform.</LI>
                </UL>
              </Section>

              <Section n="6" title="Content & Intellectual Property">
                <P>You retain ownership of Content you submit, but grant {LEGAL.brand} a non-exclusive, royalty-free licence to host, display and use that Content to operate and promote the Platform. The {LEGAL.brand} name, logo, design and software are the intellectual property of {LEGAL.entity} and may not be copied or used without permission.</P>
              </Section>

              <Section n="7" title="Disclaimers">
                <P>The Platform is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, we disclaim all warranties, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or that information about any business is complete or current.</P>
              </Section>

              <Section n="8" title="Limitation of Liability">
                <P>To the maximum extent permitted by law, {LEGAL.entity} (operating as {LEGAL.brand}) shall not be liable for any indirect, incidental or consequential damages, or for any loss arising out of your dealings with any business listed on the Platform. Our total liability for any claim shall not exceed the amount you paid to us (if any) in the 3 months preceding the claim.</P>
              </Section>

              <Section n="9" title="Indemnity">
                <P>You agree to indemnify and hold {LEGAL.entity} harmless from any claim or demand arising out of your use of the Platform, your Content, or your breach of these Terms.</P>
              </Section>

              <Section n="10" title="Governing Law">
                <P>These Terms are governed by the laws of the United Arab Emirates. Any dispute shall be subject to the exclusive jurisdiction of the courts of the Emirate of Dubai, UAE.</P>
              </Section>

              <Section n="11" title="Changes & Contact">
                <P>We may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance. Questions? Contact us at <B>{LEGAL.email}</B> or <B>{LEGAL.phone}</B>.</P>
              </Section>
            </>
          )}

          {/* ============================ PRIVACY ============================ */}
          {page === 'privacy' && (
            <>
              <Section title="Introduction">
                <P>This Privacy Policy explains how <B>{LEGAL.entity}</B> (operating the <B>{LEGAL.brand}</B> platform, "we", "us") collects, uses and protects your information when you use {LEGAL.site}. By using the Platform you consent to the practices described here.</P>
              </Section>

              <Section n="1" title="Information We Collect">
                <UL>
                  <LI><B>Account information</B> — name, email and profile details when you sign in (e.g. via Google).</LI>
                  <LI><B>Business information</B> — company details, documents and credentials submitted for listing/verification.</LI>
                  <LI><B>Enquiry data</B> — details you provide when requesting a quote or contacting a business.</LI>
                  <LI><B>Usage & device data</B> — pages viewed, approximate location and country, IP address, browser and device type, collected to measure traffic and improve the Platform.</LI>
                  <LI><B>Cookies & local storage</B> — used to keep you signed in and remember preferences such as theme.</LI>
                </UL>
              </Section>

              <Section n="2" title="How We Use Your Information">
                <UL>
                  <LI>To operate, maintain and improve the Platform.</LI>
                  <LI>To connect customers with relevant businesses when an enquiry is submitted.</LI>
                  <LI>To verify businesses and maintain trust and safety.</LI>
                  <LI>To send service-related communications (e.g. enquiry confirmations, account notices).</LI>
                  <LI>To analyse traffic and usage trends (aggregated and anonymised where possible).</LI>
                </UL>
              </Section>

              <Section n="3" title="How We Share Information">
                <UL>
                  <LI><B>With businesses</B> — when you submit an enquiry, your contact details and request are shared with the matched business(es) so they can respond.</LI>
                  <LI><B>Service providers</B> — trusted vendors who help us run the Platform (e.g. hosting, email, analytics) under confidentiality obligations.</LI>
                  <LI><B>Legal</B> — where required by law or to protect our rights, users or the public.</LI>
                </UL>
                <P>We do <B>not</B> sell your personal information.</P>
              </Section>

              <Section n="4" title="Data Retention">
                <P>We retain personal data only as long as necessary for the purposes described, or as required by law. You may request deletion of your account data by contacting us.</P>
              </Section>

              <Section n="5" title="Security">
                <P>We use industry-standard measures to protect your data. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</P>
              </Section>

              <Section n="6" title="Your Rights">
                <P>Subject to applicable law, you may request access to, correction of, or deletion of your personal data, and may object to certain processing. To exercise these rights, contact <B>{LEGAL.email}</B>.</P>
              </Section>

              <Section n="7" title="Children">
                <P>The Platform is not intended for anyone under 18, and we do not knowingly collect data from children.</P>
              </Section>

              <Section n="8" title="Changes & Contact">
                <P>We may update this Policy periodically. Material changes will be posted on this page. For privacy questions, contact <B>{LEGAL.email}</B> · {LEGAL.phone} · {LEGAL.entity}, {LEGAL.address}.</P>
              </Section>
            </>
          )}

          {/* ============================ REFUND ============================ */}
          {page === 'refund' && (
            <>
              <Section title="Overview">
                <P>This Refund Policy applies to paid subscription plans purchased by businesses on the <B>{LEGAL.brand}</B> platform ({LEGAL.site}), operated by <B>{LEGAL.entity}</B>. Because we provide a <B>free trial / demo period</B> that lets you fully evaluate the paid features <B>before</B> any payment is made, subscription fees are <B>non-refundable</B> once a plan is purchased. Please read this policy carefully before subscribing.</P>
              </Section>

              <Section n="1" title="Free Trial Before You Pay">
                <P>{LEGAL.brand} offers a free trial / demo period so that businesses can experience the platform and its paid features at no cost before deciding to subscribe. We strongly encourage you to use this trial period to confirm the Platform meets your needs, as <B>no refunds are provided after a paid plan is activated</B>.</P>
              </Section>

              <Section n="2" title="Subscription Plans">
                <P>{LEGAL.brand} offers paid plans (e.g. Silver, Gold, Platinum) that unlock additional profile and listing features. Plan inclusions, limits and prices are shown at the point of purchase.</P>
              </Section>

              <Section n="3" title="Billing">
                <P>Subscription fees are billed in advance for the selected period. By subscribing, you authorise us (or our payment processor) to charge the applicable fees. All fees are stated in UAE Dirhams (AED) and, where applicable, are inclusive of 5% VAT.</P>
              </Section>

              <Section n="4" title="No Refunds">
                <UL>
                  <LI>Subscription fees are <B>non-refundable</B> once a plan has been purchased and its features made available, since a free trial is provided beforehand to evaluate the service.</LI>
                  <LI>Partial or pro-rata refunds are <B>not</B> provided for unused time after activation, unless required by applicable law.</LI>
                  <LI><B>Exception — billing errors.</B> If you were charged in error, charged twice, or a technical issue on our side prevented you from accessing the paid features you purchased, contact us within <B>7 days</B> and we will investigate and, where appropriate, issue a correction, refund or credit.</LI>
                </UL>
              </Section>

              <Section n="5" title="Cancellation">
                <P>You may cancel your subscription at any time. Cancellation stops future renewals; it does not refund the current period. Your paid features remain active until the end of the paid period.</P>
              </Section>

              <Section n="6" title="Plan Changes">
                <P>Upgrades take effect immediately and may be charged on a pro-rata basis. Downgrades take effect at the next renewal.</P>
              </Section>

              <Section n="7" title="Failed Verification">
                <P>Purchasing a plan does not guarantee verification. If your business fails verification due to inaccurate or insufficient documents, fees already paid for the subscription period are non-refundable; you may re-submit corrected documents.</P>
              </Section>

              <Section n="8" title="Chargebacks">
                <P>If you have a billing concern, please contact us first at <B>{LEGAL.email}</B>. Initiating a chargeback without contacting us may result in suspension of your account.</P>
              </Section>

              <Section n="9" title="Contact">
                <P>For any refund or billing question, contact <B>{LEGAL.email}</B> · {LEGAL.phone} · {LEGAL.entity}, {LEGAL.address}.</P>
              </Section>
            </>
          )}

        </div>

        {/* Legal entity footer */}
        <div style={{ textAlign: 'center', fontSize: 11.5, color: TH.t3, marginTop: 22, lineHeight: 1.7 }}>
          {LEGAL.brand} is operated by <B>{LEGAL.entity}</B><br/>
          Trade Licence No. {LEGAL.license} · Commercial Register No. {LEGAL.register} · Dubai Chamber Membership No. {LEGAL.chamber}<br/>
          {LEGAL.address}<br/>
          {LEGAL.email} · {LEGAL.phone}<br/>
          <span style={{ display: 'inline-block', marginTop: 6 }}>© Copyright 2026 {LEGAL.entity}. All rights reserved.</span>
        </div>
      </div>
    </div>
  )
}
