import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardCopy, Download, FileText, Link2, Printer, ReceiptText } from 'lucide-react'
import { Badge, EmptyState, PageHeader, ReportSection, StatusBadge, getStatusLabel } from './components'
import { generateReport, saveReport } from './services/api'
import { formatMoney } from './utils'
import { getAttachmentPreviewUrl } from './attachmentUtils'
import ReportShareManager from './ReportShareManager'

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
    new Date(`2026-${String(index + 1).padStart(2, '0')}-01T00:00:00Z`),
  ),
}))

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</span>{children}</label>
}

function PageHeading() {
  return <PageHeader title="Reports" description="Generate, review and share monthly client delivery." />
}

function ReportCard({ number, title, icon: Icon, children, className = '' }) {
  return <section className={`rounded-xl border border-line bg-white p-5 shadow-soft sm:p-6 ${className}`}><div className="flex items-center justify-between border-b border-line pb-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/5 text-blue"><Icon size={16} /></span><h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3></div><span className="text-2xl font-light text-zinc-200">{number}</span></div><div className="mt-5 text-sm leading-6 text-zinc-600">{children}</div></section>
}

export default function ReportsPage({ clients, tasks, settings, isFallback, onActivityRefresh }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [month, setMonth] = useState(6)
  const [year, setYear] = useState(2026)
  const [status, setStatus] = useState(settings.default_report_status || 'Draft')
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [savedReportId, setSavedReportId] = useState('')

  useEffect(() => {
    if (!clients.some((client) => client.id === clientId)) setClientId(clients[0]?.id || '')
  }, [clients, clientId])
  useEffect(() => {
    if (!report) setStatus(settings.default_report_status || 'Draft')
  }, [report, settings.default_report_status])

  const client = clients.find((item) => item.id === clientId)
  const periodPrefix = `${year}-${String(month).padStart(2, '0')}`
  const scopedTasks = tasks.filter((task) => task.clientId === clientId)
  const fallbackCompleted = scopedTasks.filter((task) => task.status === 'Completed' && (task.completedAt || task.deadline || '').startsWith(periodPrefix))
  const completed = report?.work_completed || fallbackCompleted
  const deliverables = report?.deliverables || completed.filter((task) => ['Reels', 'Print Design', 'Creative'].includes(task.category))
  const technicalWork = report?.technical_work || completed.filter((task) => ['Web', 'Technical', 'Development', 'SEO', 'Digital'].includes(task.category))
  const revisions = report?.revisions_completed || completed.filter((task) => `${task.title} ${task.description || ''}`.toLowerCase().includes('revision'))
  const includedPackageTasks = report?.included_package_tasks || completed.filter((task) => !Number(task.is_billable) && !task.billable)
  const pending = report?.pending_tasks || scopedTasks.filter((task) => task.status !== 'Completed')
  const billable = report?.extra_billable_work?.items || scopedTasks.filter((task) => task.billable && (task.completedAt || task.deadline || '').startsWith(periodPrefix))
  const nextMonthPlan = report?.next_month_plan || ['Complete pending deliverables and revisions.', 'Review campaign performance and document findings.', 'Confirm next month priorities with the client.']
  const monthLabel = MONTHS.find((item) => item.value === Number(month))?.label || ''
  const amountFor = (task) => Number(task.billable_amount ?? task.amount ?? 0)
  const billableTotal = Number(report?.extra_billable_work?.total ?? billable.reduce((total, task) => total + amountFor(task), 0))
  const billingSummary = report?.billing_summary || {
    monthly_fee: Number(client?.monthlyFee || 0),
    service_package: client?.servicePackage || '',
    included_task_count: includedPackageTasks.length,
    extra_billable_task_count: billable.length,
    extra_amount: billableTotal,
    total_invoice_amount: Number(client?.monthlyFee || 0) + billableTotal,
    paid_amount: 0,
    outstanding_amount: Number(client?.monthlyFee || 0) + billableTotal,
    payment_status: 'Unpaid',
  }
  const attachmentsFor = (task) => (task.attachments || []).map((attachment) => ({
    ...attachment,
    url: getAttachmentPreviewUrl(attachment, 'download'),
  }))
  const listText = (items, formatter = (item) => item.title) => items.map((item) => `- ${formatter(item)}`).join('\n') || '- None recorded'
  const completedText = completed.map((task) => {
    const proofs = attachmentsFor(task).map((attachment) => `  Proof: ${attachment.title} — ${attachment.url}`).join('\n')
    return `- ${task.title}${proofs ? `\n${proofs}` : ''}`
  }).join('\n') || '- None recorded'

  const reportText = `${settings.agency_name.toUpperCase()}
${settings.report_title.toUpperCase()}

Client: ${client?.name || 'Client'}
Period: ${monthLabel} ${year}
Status: ${status}

Work completed:
${completedText}

Designs/content delivered:
${listText(deliverables)}

Website/technical work:
${listText(technicalWork)}

Revisions completed:
${listText(revisions)}

Monthly package:
Package: ${billingSummary.service_package || client?.servicePackage || 'Not set'}
Monthly package fee: ${formatMoney(billingSummary.monthly_fee, settings.currency)}
Included package tasks: ${billingSummary.included_task_count}

Pending tasks:
${listText(pending, (task) => `${task.title} (${getStatusLabel(task.status)})`)}

Extra billable work:
${listText(billable, (task) => `${task.title}: ${formatMoney(amountFor(task))}`)}
Extra billable amount: ${formatMoney(billingSummary.extra_amount, settings.currency)}
Total invoice amount: ${formatMoney(billingSummary.total_invoice_amount, settings.currency)}
Paid amount: ${formatMoney(billingSummary.paid_amount, settings.currency)}
Outstanding amount: ${formatMoney(billingSummary.outstanding_amount, settings.currency)}
Payment status: ${billingSummary.payment_status}

Next month plan:
${nextMonthPlan.map((item) => `- ${item}`).join('\n')}

${settings.default_report_note ? `Note:\n${settings.default_report_note}\n\n` : ''}${settings.report_footer_text}

${settings.legal_business_name}
Contact: ${settings.contact_person} · ${settings.agency_email} · ${settings.agency_phone}
PAN: ${settings.pan_number}`

  const contentForSave = (nextStatus, sourceReport = report) => ({
    client: sourceReport?.client || client,
    period: { month: Number(month), year: Number(year), label: `${monthLabel} ${year}` },
    status: nextStatus,
    work_completed: sourceReport?.work_completed || completed,
    deliverables: sourceReport?.deliverables || deliverables,
    technical_work: sourceReport?.technical_work || technicalWork,
    revisions_completed: sourceReport?.revisions_completed || revisions,
    included_package_tasks: sourceReport?.included_package_tasks || includedPackageTasks,
    pending_tasks: sourceReport?.pending_tasks || pending,
    extra_billable_work: sourceReport?.extra_billable_work || { items: billable, total: billableTotal },
    billing_summary: sourceReport?.billing_summary || billingSummary,
    next_month_plan: sourceReport?.next_month_plan || nextMonthPlan,
    prepared_by: settings.prepared_by,
    branding: settings,
  })

  const saveSnapshot = (nextStatus, sourceReport = report) => saveReport({
    client_id: Number(clientId),
    report_month: Number(month),
    report_year: Number(year),
    report_content: contentForSave(nextStatus, sourceReport),
    status: nextStatus,
  })

  const handleGenerate = async () => {
    const toastId = toast.loading('Generating report…')
    setGenerating(true)
    setError('')
    setReport(null)

    try {
      if (isFallback) throw new Error('The backend API is unavailable. Reports cannot be generated or saved in fallback mode.')
      const generatedReport = await generateReport(clientId, month, year)
      const savedStatus = generatedReport.saved_report?.status || 'Draft'
      setStatus(savedStatus)
      setReport(generatedReport)
      const saved = await saveSnapshot(savedStatus, generatedReport)
      setSavedReportId(String(saved.id || generatedReport.saved_report?.id || ''))
      await onActivityRefresh?.()
      toast.success('Report generated.', { id: toastId })
    } catch (requestError) {
      setError(requestError.message)
      toast.error(requestError.message, { id: toastId })
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (nextStatus) => {
    setStatus(nextStatus)
    if (!report || isFallback) return

    setSavingStatus(true)
    setError('')
    try {
      const saved = await saveSnapshot(nextStatus)
      setSavedReportId(String(saved.id || savedReportId))
      await onActivityRefresh?.()
    } catch (requestError) {
      setError(`Could not save report status. ${requestError.message}`)
    } finally {
      setSavingStatus(false)
    }
  }

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText)
    setCopied(true)
    toast.success('Report copied.')
    window.setTimeout(() => setCopied(false), 1800)
  }

  const downloadReport = () => {
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
    const listHtml = (items, formatter = (item) => item.title) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(formatter(item))}</li>`).join('')}</ul>` : '<p>None recorded.</p>'
    const completedHtml = completed.length ? `<ul>${completed.map((task) => `<li><strong>${escapeHtml(task.title)}</strong>${attachmentsFor(task).length ? `<ul>${attachmentsFor(task).map((attachment) => `<li><a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.title)}</a></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : '<p>None recorded.</p>'
    const enhancedHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(client?.name || 'Client')} - ${monthLabel} ${year}</title><style>body{font-family:Helvetica,Arial,sans-serif;color:#18181b;max-width:800px;margin:48px auto;padding:0 24px;line-height:1.6}header{border-bottom:3px solid ${escapeHtml(settings.brand_color)};padding-bottom:24px;margin-bottom:24px}.brand{color:${escapeHtml(settings.brand_color)};font-weight:700;letter-spacing:.12em;font-size:12px}h1{margin:8px 0 0;font-size:30px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#52525b;border-top:1px solid #e4e4e7;padding-top:18px;margin-top:22px}li{margin:5px 0}a{color:${escapeHtml(settings.brand_color)}}.total{display:flex;justify-content:space-between;border-top:1px solid #e4e4e7;padding-top:10px;font-weight:700}footer{margin-top:36px;border-top:1px solid #e4e4e7;padding-top:18px;color:#52525b}</style></head><body><header><div class="brand">${escapeHtml(settings.logo_url || `${settings.agency_name} / Work OS`)}</div><h1>${escapeHtml(settings.report_title)}</h1><p>${escapeHtml(client?.name || '')} · ${monthLabel} ${year} · ${escapeHtml(status)}</p></header><p><strong>${escapeHtml(settings.legal_business_name)}</strong><br>${escapeHtml(settings.contact_person)} · ${escapeHtml(settings.agency_email)} · ${escapeHtml(settings.agency_phone)}<br>PAN: ${escapeHtml(settings.pan_number)}${settings.agency_address ? `<br>${escapeHtml(settings.agency_address)}` : ''}</p><h2>Work completed</h2>${completedHtml}<h2>Designs and content delivered</h2>${listHtml(deliverables)}<h2>Website and technical work</h2>${listHtml(technicalWork)}<h2>Revisions completed</h2>${listHtml(revisions)}<h2>Monthly package</h2><p><strong>${escapeHtml(billingSummary.service_package || client?.servicePackage || 'Not set')}</strong><br>Monthly package fee: ${escapeHtml(formatMoney(billingSummary.monthly_fee, settings.currency))}<br>Included package tasks: ${escapeHtml(billingSummary.included_task_count)}<br>Payment status: ${escapeHtml(billingSummary.payment_status)}</p><h2>Pending tasks</h2>${listHtml(pending, (task) => `${task.title} (${getStatusLabel(task.status)})`)}<h2>Extra billable work</h2>${listHtml(billable, (task) => `${task.title}: ${formatMoney(amountFor(task), settings.currency)}`)}<p class="total"><span>Total invoice amount</span><span>${escapeHtml(formatMoney(billingSummary.total_invoice_amount, settings.currency))}</span></p><p>Extra billable amount: ${escapeHtml(formatMoney(billingSummary.extra_amount, settings.currency))}<br>Paid: ${escapeHtml(formatMoney(billingSummary.paid_amount, settings.currency))}<br>Outstanding: ${escapeHtml(formatMoney(billingSummary.outstanding_amount, settings.currency))}</p><h2>Next month plan</h2>${listHtml(nextMonthPlan, (item) => item)}${settings.default_report_note ? `<h2>Note</h2><p>${escapeHtml(settings.default_report_note)}</p>` : ''}<footer>${escapeHtml(settings.report_footer_text)}<br>${escapeHtml(settings.prepared_by)}</footer></body></html>`
    const enhancedUrl = URL.createObjectURL(new Blob([enhancedHtml], { type: 'text/html;charset=utf-8' }))
    const enhancedLink = document.createElement('a')
    enhancedLink.href = enhancedUrl
    enhancedLink.download = `${(client?.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}-${String(month).padStart(2, '0')}-report.html`
    enhancedLink.click()
    URL.revokeObjectURL(enhancedUrl)
    toast.success('Report downloaded.')
    return
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(client?.name || 'Client')} - ${monthLabel} ${year}</title><style>body{font-family:Helvetica,Arial,sans-serif;color:#18181b;max-width:800px;margin:48px auto;padding:0 24px;line-height:1.6}header{border-bottom:3px solid ${escapeHtml(settings.brand_color)};padding-bottom:24px;margin-bottom:24px}.brand{color:${escapeHtml(settings.brand_color)};font-weight:700;letter-spacing:.12em;font-size:12px}h1{margin:8px 0 0;font-size:30px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#52525b;border-top:1px solid #e4e4e7;padding-top:18px;margin-top:22px}li{margin:5px 0}a{color:${escapeHtml(settings.brand_color)}}.total{display:flex;justify-content:space-between;border-top:1px solid #e4e4e7;padding-top:10px;font-weight:700}footer{margin-top:36px;border-top:1px solid #e4e4e7;padding-top:18px;color:#52525b}</style></head><body><header><div class="brand">${escapeHtml(settings.logo_url || `${settings.agency_name} / Work OS`)}</div><h1>${escapeHtml(settings.report_title)}</h1><p>${escapeHtml(client?.name || '')} · ${monthLabel} ${year} · ${escapeHtml(status)}</p></header><p><strong>${escapeHtml(settings.legal_business_name)}</strong><br>${escapeHtml(settings.contact_person)} · ${escapeHtml(settings.agency_email)} · ${escapeHtml(settings.agency_phone)}<br>PAN: ${escapeHtml(settings.pan_number)}${settings.agency_address ? `<br>${escapeHtml(settings.agency_address)}` : ''}</p><h2>Work completed</h2>${completedHtml}<h2>Designs and content delivered</h2>${listHtml(deliverables)}<h2>Website and technical work</h2>${listHtml(technicalWork)}<h2>Revisions completed</h2>${listHtml(revisions)}<h2>Pending tasks</h2>${listHtml(pending, (task) => `${task.title} (${getStatusLabel(task.status)})`)}<h2>Extra billable work</h2>${listHtml(billable, (task) => `${task.title}: ${formatMoney(amountFor(task), settings.currency)}`)}<p class="total"><span>Total billable amount</span><span>${escapeHtml(formatMoney(billableTotal, settings.currency))}</span></p><h2>Next month plan</h2>${listHtml(nextMonthPlan, (item) => item)}${settings.default_report_note ? `<h2>Note</h2><p>${escapeHtml(settings.default_report_note)}</p>` : ''}<footer>${escapeHtml(settings.report_footer_text)}<br>${escapeHtml(settings.prepared_by)}</footer></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(client?.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}-${String(month).padStart(2, '0')}-report.html`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded.')
  }

  return <>
    <PageHeading />
    <div className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
      <div className="mb-4"><h2 className="text-sm font-semibold text-zinc-900">Report generator</h2><p className="mt-1 text-xs text-zinc-400">Select the client workspace and reporting period.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_130px_180px_auto]">
        <Field label="Client"><select className="w-full rounded-lg border border-line bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/10" value={clientId} onChange={(event) => { setClientId(event.target.value); setReport(null) }}>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Month"><select className="w-full rounded-lg border border-line bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/10" value={month} onChange={(event) => { setMonth(Number(event.target.value)); setReport(null) }}>{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Year"><select className="w-full rounded-lg border border-line bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/10" value={year} onChange={(event) => { setYear(Number(event.target.value)); setReport(null) }}>{[2025, 2026, 2027].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Report status"><select className="w-full rounded-lg border border-line bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/10" value={status} onChange={(event) => handleStatusChange(event.target.value)} disabled={savingStatus}>{['Draft', 'Pending Review', 'Sent'].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <button className="button-primary self-end" disabled={!clientId || generating} onClick={handleGenerate}><FileText size={16} />{generating ? 'Generating…' : 'Generate report'}</button>
      </div>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>

    {report && savedReportId && <section className="mx-auto mt-6 max-w-[1320px] overflow-hidden rounded-xl border border-line bg-white shadow-soft"><div className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/5 text-blue"><Link2 size={16} /></span><div><h2 className="text-sm font-semibold text-zinc-900">Client portal share</h2><p className="mt-1 text-xs text-zinc-400">Manage secure view-only access.</p></div></div><ReportShareManager reportId={savedReportId} clientId={clientId} onActivityRefresh={onActivityRefresh} /></section>}

    {report ? <article id="report-preview" className="mx-auto mt-6 max-w-[1320px] overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <header className="border-b-4 p-6 sm:p-8" style={{ borderColor: settings.brand_color }}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: settings.brand_color }}>{settings.logo_url || `${settings.agency_name} / Work OS`}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{settings.report_title}</h2><p className="mt-2 text-lg">{client?.name}</p><p className="mt-1 text-sm text-zinc-500">{monthLabel} {year}</p></div>
          <span className="border border-line px-3 py-1.5 text-xs font-semibold">{status}</span>
        </div>
        <div className="no-print mt-6 flex flex-wrap gap-2 rounded-xl border border-line bg-zinc-50/70 p-3">
          <button className="button-secondary" onClick={() => window.print()}><Printer size={15} />Export PDF</button>
          <button className="button-secondary" onClick={copyReport}><ClipboardCopy size={15} />{copied ? 'Copied' : 'Copy Report'}</button>
          <button className="button-secondary" onClick={downloadReport}><Download size={15} />Download Report</button>
        </div>
      </header>
      <div className="p-6 sm:p-8">
        <ReportCard number="01" title="Work completed" icon={CheckCircle2}>{completed.length ? <ul className="space-y-4">{completed.map((task) => <li key={task.id} className="border-b border-zinc-100 pb-3 last:border-0"><div className="flex justify-between gap-4"><span className="font-semibold text-zinc-800">{task.title}</span><Badge className="border-zinc-200 bg-zinc-50 text-zinc-500">{task.category}</Badge></div>{attachmentsFor(task).length > 0 && <div className="mt-2 flex flex-wrap gap-2">{attachmentsFor(task).map((attachment) => <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-blue/15 bg-blue/5 px-2 py-1 text-xs font-semibold text-blue"><Link2 size={11} />{attachment.title}</a>)}</div>}</li>)}</ul> : <p className="text-zinc-500">No completed work recorded for this month.</p>}</ReportCard>
        <ReportSection title="Designs and content delivered">{deliverables.length ? <ul className="space-y-2">{deliverables.map((task) => <li key={task.id}>{task.title}</li>)}</ul> : <p className="text-zinc-500">No design or content deliverables recorded.</p>}</ReportSection>
        <ReportSection title="Website and technical work">{technicalWork.length ? <ul className="space-y-2">{technicalWork.map((task) => <li key={task.id}>{task.title}</li>)}</ul> : <p className="text-zinc-500">No website or technical work recorded.</p>}</ReportSection>
        <ReportSection title="Revisions completed">{revisions.length ? <ul className="space-y-2">{revisions.map((task) => <li key={task.id}>{task.title}</li>)}</ul> : <p className="text-zinc-500">No completed revisions recorded.</p>}</ReportSection>
        <ReportCard number="02" title="Monthly package" icon={ReceiptText}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs font-semibold text-zinc-400">Package</p><p className="mt-1 font-semibold text-zinc-800">{billingSummary.service_package || client?.servicePackage || 'Not set'}</p></div>
            <div><p className="text-xs font-semibold text-zinc-400">Monthly fee</p><p className="mt-1 font-semibold text-zinc-800">{formatMoney(billingSummary.monthly_fee, settings.currency)}</p></div>
            <div><p className="text-xs font-semibold text-zinc-400">Included tasks</p><p className="mt-1 font-semibold text-zinc-800">{billingSummary.included_task_count}</p></div>
            <div><p className="text-xs font-semibold text-zinc-400">Payment status</p><p className="mt-1 font-semibold text-zinc-800">{billingSummary.payment_status}</p></div>
          </div>
        </ReportCard>
        <ReportCard number="03" title="Pending tasks" icon={FileText}>{pending.length ? <div className="space-y-2">{pending.map((task) => <div key={task.id} className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2"><span>{task.title}</span><StatusBadge status={task.status} /></div>)}</div> : <p>No pending tasks.</p>}</ReportCard>
        <ReportCard number="04" title="Billable extras" icon={ReceiptText}>{billable.length ? <div className="space-y-2">{billable.map((task) => <div key={task.id} className="flex justify-between gap-4"><span>{task.title}</span><strong>{formatMoney(amountFor(task))}</strong></div>)}</div> : <p className="text-zinc-500">No extra billable work recorded.</p>}<div className="mt-3 space-y-2 border-t border-zinc-900 pt-3 text-base"><div className="flex justify-between"><span>Extra billable amount</span><strong>{formatMoney(billingSummary.extra_amount)}</strong></div><div className="flex justify-between"><span>Total invoice amount</span><strong>{formatMoney(billingSummary.total_invoice_amount)}</strong></div><div className="flex justify-between text-sm text-zinc-500"><span>Outstanding</span><strong>{formatMoney(billingSummary.outstanding_amount)}</strong></div></div></ReportCard>
        <ReportCard number="05" title="Next month plan" icon={FileText}><ol className="space-y-2">{nextMonthPlan.map((item, index) => <li className="flex gap-3" key={item}><span className="text-xs font-bold text-blue">{String(index + 1).padStart(2, '0')}</span><span>{item}</span></li>)}</ol></ReportCard>
        {settings.default_report_note && <ReportSection title="Report note"><p>{settings.default_report_note}</p></ReportSection>}
        <footer className="mt-7 border-t border-line pt-5 text-sm text-zinc-500"><p className="font-semibold text-ink">{settings.report_footer_text}</p><p className="mt-1">{settings.legal_business_name} · PAN {settings.pan_number}</p><p className="mt-1">{settings.contact_person} · {settings.agency_email} · {settings.agency_phone}</p></footer>
      </div>
    </article> : <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-soft"><EmptyState title="Your report preview will appear here" description="Choose a client and reporting period, then generate a branded delivery report." /></div>}
  </>
}
