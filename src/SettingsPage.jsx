import { useEffect, useState } from 'react'
import { Building2, FileText, Save, Settings2, UserRound } from 'lucide-react'

import { Badge, PageHeader } from './components'
import { updateUser } from './services/api'

const sections = [
  ['Agency Profile', Building2],
  ['Report Branding', FileText],
  ['System Defaults', Settings2],
  ['Account/Profile', UserRound],
]

function Field({ label, children, className = '' }) {
  return <label className={className}><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>
}

export default function SettingsPage({
  settings,
  currentUser,
  onSaveSettings,
  onCurrentUserUpdate,
  resetWorkspace,
}) {
  const [activeSection, setActiveSection] = useState('Agency Profile')
  const [form, setForm] = useState(settings)
  const [profile, setProfile] = useState({ name: currentUser.name, email: currentUser.email })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const isAdmin = currentUser.role === 'admin'

  useEffect(() => setForm(settings), [settings])
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    try {
      await onSaveSettings(form)
      setMessage('Settings saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }
  const saveProfile = async () => {
    setSaving(true)
    setMessage('')
    try {
      const updated = await updateUser(currentUser.id, {
        name: profile.name,
        email: profile.email,
        role: currentUser.role,
        status: currentUser.status,
      })
      onCurrentUserUpdate(updated)
      setMessage('Profile updated.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return <>
    <PageHeader number="10" title="Settings" description="Agency identity, report branding, workspace defaults, and your profile." />
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav className="panel h-fit p-2">{sections.map(([section, Icon]) => <button key={section} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${activeSection === section ? 'bg-blue text-white shadow-sm' : 'text-zinc-600 hover:bg-canvas hover:text-ink'}`} onClick={() => { setActiveSection(section); setMessage('') }}><Icon size={16} />{section}</button>)}</nav>
      <section className="panel">
        <header className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{activeSection}</h2><p className="mt-1 text-sm text-zinc-500">{isAdmin ? 'Update saved workspace information.' : 'You have read-only access. Administrator access is required for updates.'}</p></div><Badge className={isAdmin ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}>{isAdmin ? 'Admin access' : 'Read only'}</Badge></header>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {activeSection === 'Agency Profile' && <>
            <Field label="Agency name"><input className="field" value={form.agency_name || ''} onChange={(event) => change('agency_name', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Legal business name"><input className="field" value={form.legal_business_name || ''} onChange={(event) => change('legal_business_name', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Contact person"><input className="field" value={form.contact_person || ''} onChange={(event) => change('contact_person', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Email"><input className="field" type="email" value={form.agency_email || ''} onChange={(event) => change('agency_email', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Phone"><input className="field" value={form.agency_phone || ''} onChange={(event) => change('agency_phone', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="PAN number"><input className="field" value={form.pan_number || ''} onChange={(event) => change('pan_number', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Website"><input className="field" type="url" value={form.agency_website || ''} onChange={(event) => change('agency_website', event.target.value)} disabled={!isAdmin} placeholder="https://" /></Field>
            <Field label="Address"><input className="field" value={form.agency_address || ''} onChange={(event) => change('agency_address', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Notes" className="sm:col-span-2"><textarea className="field min-h-24" value={form.agency_notes || ''} onChange={(event) => change('agency_notes', event.target.value)} disabled={!isAdmin} /></Field>
          </>}
          {activeSection === 'Report Branding' && <>
            <Field label="Report title"><input className="field" value={form.report_title || ''} onChange={(event) => change('report_title', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Prepared by"><input className="field" value={form.prepared_by || ''} onChange={(event) => change('prepared_by', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Footer text"><input className="field" value={form.report_footer_text || ''} onChange={(event) => change('report_footer_text', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Brand color"><input className="field h-11 p-1" type="color" value={form.brand_color || '#002FA7'} onChange={(event) => change('brand_color', event.target.value)} disabled={!isAdmin} /></Field>
            <Field label="Logo URL / text placeholder" className="sm:col-span-2"><input className="field" value={form.logo_url || ''} onChange={(event) => change('logo_url', event.target.value)} disabled={!isAdmin} placeholder="Logo URL or text" /></Field>
            <Field label="Default report note" className="sm:col-span-2"><textarea className="field min-h-24" value={form.default_report_note || ''} onChange={(event) => change('default_report_note', event.target.value)} disabled={!isAdmin} /></Field>
          </>}
          {activeSection === 'System Defaults' && <>
            <Field label="Currency"><select className="field" value={form.currency || 'NPR'} onChange={(event) => change('currency', event.target.value)} disabled={!isAdmin}><option>NPR</option><option>USD</option><option>INR</option></select></Field>
            <Field label="Default task priority"><select className="field" value={form.default_task_priority || 'Medium'} onChange={(event) => change('default_task_priority', event.target.value)} disabled={!isAdmin}>{['Low', 'Medium', 'High', 'Urgent'].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Default report status"><select className="field" value={form.default_report_status || 'Draft'} onChange={(event) => change('default_report_status', event.target.value)} disabled={!isAdmin}>{['Draft', 'Pending Review', 'Sent'].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Date format"><select className="field" value={form.date_format || 'MMM d, yyyy'} onChange={(event) => change('date_format', event.target.value)} disabled={!isAdmin}><option>MMM d, yyyy</option><option>dd/MM/yyyy</option><option>yyyy-MM-dd</option></select></Field>
            <Field label="Default monthly report template" className="sm:col-span-2"><textarea className="field min-h-28" value={form.default_monthly_report_template || ''} onChange={(event) => change('default_monthly_report_template', event.target.value)} disabled={!isAdmin} /></Field>
          </>}
          {activeSection === 'Account/Profile' && <>
            <Field label="Name"><input className="field" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} disabled={!isAdmin} /></Field>
            <Field label="Email"><input className="field" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} disabled={!isAdmin} /></Field>
            <Field label="Role"><input className="field capitalize" value={currentUser.role} disabled /></Field>
            <Field label="Status"><input className="field capitalize" value={currentUser.status} disabled /></Field>
          </>}
        </div>
        {message && <p className={`mx-5 mb-5 border p-3 text-sm sm:mx-6 ${message.includes('saved') || message.includes('updated') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</p>}
        <footer className="flex flex-wrap justify-between gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button className="button-secondary text-red-700" onClick={() => window.confirm('Reset local fallback data?') && resetWorkspace()}>Reset fallback data</button><button className="button-primary" disabled={saving || !isAdmin} onClick={activeSection === 'Account/Profile' ? saveProfile : saveSettings}><Save size={15} />{saving ? 'Saving…' : 'Save changes'}</button></footer>
      </section>
    </div>
  </>
}
