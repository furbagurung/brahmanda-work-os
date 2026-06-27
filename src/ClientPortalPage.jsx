import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, FileText } from 'lucide-react'

import { getPublicPortalReport } from './services/api'

const money = (value, currency = 'NPR') => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
}).format(Number(value || 0))

function PortalSection({ number, title, children }) {
  return <section className="grid border-t border-zinc-200 py-7 md:grid-cols-[90px_1fr]"><span className="text-3xl font-light text-zinc-300">{number}</span><div><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{title}</h2><div className="mt-5 text-sm leading-6 text-zinc-700">{children}</div></div></section>
}

export default function ClientPortalPage({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getPublicPortalReport(token).then(setData).catch(() => setError('This report link is expired or unavailable.'))
  }, [token])

  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6"><section className="w-full max-w-lg border border-zinc-200 bg-white p-8 text-left"><FileText size={28} className="text-zinc-300" /><h1 className="mt-6 text-2xl font-semibold tracking-tight">Report unavailable</h1><p className="mt-3 text-sm leading-6 text-zinc-500">{error}</p></section></main>
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8]"><div className="h-8 w-8 animate-spin border-2 border-zinc-200 border-t-[#002FA7]" aria-label="Loading report" /></main>

  const { report, client, branding } = data
  const content = report.content || {}
  const completed = content.work_completed || []
  const pending = content.pending_tasks || []
  const billable = content.extra_billable_work?.items || []
  const total = content.extra_billable_work?.total ?? billable.reduce((sum, item) => sum + Number(item.billable_amount || item.amount || 0), 0)
  const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(`2026-${String(report.month).padStart(2, '0')}-01T00:00:00Z`))
  const accent = branding.brand_color || '#002FA7'

  return <main className="min-h-screen bg-[#F7F7F8] px-4 py-6 text-zinc-900 sm:px-6 sm:py-10">
    <article className="mx-auto max-w-5xl border border-zinc-200 bg-white">
      <header className="grid border-b border-zinc-200 lg:grid-cols-[1fr_260px]">
        <div className="p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{branding.logo_url || branding.agency_name || 'Brahmanda Tech'}</p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{branding.report_title || 'Monthly Client Report'}</h1>
          <p className="mt-7 text-xl font-medium">{client.name}</p>
        </div>
        <div className="flex flex-col justify-between border-t border-zinc-200 p-6 lg:border-l lg:border-t-0">
          <div><p className="text-5xl font-light leading-none" style={{ color: accent }}>{String(report.month).padStart(2, '0')}</p><p className="mt-2 text-sm font-semibold">{month} {report.year}</p></div>
          <div className="mt-10"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Report status</p><p className="mt-2 inline-flex border border-zinc-200 px-2.5 py-1 text-xs font-semibold">{report.status}</p></div>
        </div>
      </header>

      <div className="px-6 sm:px-10">
        <PortalSection number="01" title="Work completed">{completed.length ? <div className="space-y-5">{completed.map((task) => <article key={task.id || task.title} className="border-b border-zinc-100 pb-5 last:border-0"><div className="flex items-start gap-3"><CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: accent }} /><div><h3 className="font-semibold text-zinc-900">{task.title}</h3>{task.description && <p className="mt-1 text-zinc-500">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-2">{(task.attachments || []).map((proof) => <a key={proof.id || proof.url} href={proof.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-zinc-200 px-2.5 py-1 text-xs font-semibold hover:border-zinc-400" style={{ color: accent }}>{proof.title}<ExternalLink size={11} /></a>)}</div></div></div></article>)}</div> : <p className="text-zinc-500">No completed work was recorded for this period.</p>}</PortalSection>
        <PortalSection number="02" title="Pending tasks">{pending.length ? <div className="divide-y divide-zinc-100">{pending.map((task) => <div className="flex flex-col justify-between gap-2 py-3 first:pt-0 sm:flex-row" key={task.id || task.title}><span className="font-medium text-zinc-900">{task.title}</span><span className="text-xs font-semibold text-zinc-500">{task.status}</span></div>)}</div> : <p>No pending tasks.</p>}</PortalSection>
        <PortalSection number="03" title="Extra billable work">{billable.length ? <div className="divide-y divide-zinc-100">{billable.map((task) => <div className="flex justify-between gap-4 py-3 first:pt-0" key={task.id || task.title}><span>{task.title}</span><strong>{money(task.billable_amount ?? task.amount, branding.currency)}</strong></div>)}<div className="flex justify-between border-t border-zinc-900 pt-4 text-base"><span>Total</span><strong>{money(total, branding.currency)}</strong></div></div> : <p className="text-zinc-500">No extra billable work was included.</p>}</PortalSection>
        {(content.default_report_note || branding.default_report_note) && <PortalSection number="04" title="Report note"><p>{content.default_report_note || branding.default_report_note}</p></PortalSection>}
      </div>

      <footer className="grid border-t border-zinc-200 bg-[#F7F7F8] p-6 text-sm sm:grid-cols-2 sm:p-10">
        <div><p className="font-semibold text-zinc-900">{branding.report_footer_text || 'Prepared by Brahmanda Tech'}</p><p className="mt-2 text-zinc-500">Prepared by {content.prepared_by || branding.prepared_by || branding.agency_name}</p></div>
        <div className="mt-6 text-zinc-500 sm:mt-0 sm:text-right"><p>{branding.legal_business_name}</p><p>{[branding.contact_person, branding.agency_email, branding.agency_phone].filter(Boolean).join(' · ')}</p>{branding.agency_address && <p>{branding.agency_address}</p>}</div>
      </footer>
    </article>
  </main>
}
