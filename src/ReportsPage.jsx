import { useEffect, useState } from 'react'
import { ClipboardCopy, Download, FileText, Printer } from 'lucide-react'
import { EmptyState, ReportSection, StatusBadge } from './components'
import { generateReport, saveReport } from './services/api'
import { formatMoney } from './utils'

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
    new Date(`2026-${String(index + 1).padStart(2, '0')}-01T00:00:00Z`),
  ),
}))

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>
}

function PageHeading() {
  return <div className="mb-8 flex items-start gap-4 border-b border-line pb-7 sm:gap-5"><span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">06</span><div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Generate, review, save, and export monthly client delivery reports.</p></div></div>
}

export default function ReportsPage({ clients, tasks, isFallback }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [month, setMonth] = useState(6)
  const [year, setYear] = useState(2026)
  const [status, setStatus] = useState('Draft')
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clients.some((client) => client.id === clientId)) setClientId(clients[0]?.id || '')
  }, [clients, clientId])

  const client = clients.find((item) => item.id === clientId)
  const periodPrefix = `${year}-${String(month).padStart(2, '0')}`
  const scopedTasks = tasks.filter((task) => task.clientId === clientId)
  const fallbackCompleted = scopedTasks.filter((task) => task.status === 'Completed' && (task.completedAt || task.deadline || '').startsWith(periodPrefix))
  const completed = report?.work_completed || fallbackCompleted
  const deliverables = report?.deliverables || completed.filter((task) => ['Design', 'Content', 'Social Media', 'Campaign', 'Presentation'].includes(task.category))
  const technicalWork = report?.technical_work || completed.filter((task) => ['Web', 'Technical', 'Development', 'SEO', 'Digital'].includes(task.category))
  const revisions = report?.revisions_completed || completed.filter((task) => `${task.title} ${task.description || ''}`.toLowerCase().includes('revision'))
  const pending = report?.pending_tasks || scopedTasks.filter((task) => task.status !== 'Completed')
  const billable = report?.extra_billable_work?.items || scopedTasks.filter((task) => task.billable && (task.completedAt || task.deadline || '').startsWith(periodPrefix))
  const nextMonthPlan = report?.next_month_plan || ['Complete pending deliverables and revisions.', 'Review campaign performance and document findings.', 'Confirm next month priorities with the client.']
  const monthLabel = MONTHS.find((item) => item.value === Number(month))?.label || ''
  const amountFor = (task) => Number(task.billable_amount ?? task.amount ?? 0)
  const billableTotal = Number(report?.extra_billable_work?.total ?? billable.reduce((total, task) => total + amountFor(task), 0))
  const attachmentsFor = (task) => task.attachments || []
  const listText = (items, formatter = (item) => item.title) => items.map((item) => `- ${formatter(item)}`).join('\n') || '- None recorded'
  const completedText = completed.map((task) => {
    const proofs = attachmentsFor(task).map((attachment) => `  Proof: ${attachment.title} — ${attachment.url}`).join('\n')
    return `- ${task.title}${proofs ? `\n${proofs}` : ''}`
  }).join('\n') || '- None recorded'

  const reportText = `BRAHMANDA TECH
MONTHLY CLIENT REPORT

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

Pending tasks:
${listText(pending, (task) => `${task.title} (${task.status})`)}

Extra billable work:
${listText(billable, (task) => `${task.title}: ${formatMoney(amountFor(task))}`)}
Total billable amount: ${formatMoney(billableTotal)}

Next month plan:
${nextMonthPlan.map((item) => `- ${item}`).join('\n')}

Prepared by Brahmanda Tech`

  const contentForSave = (nextStatus, sourceReport = report) => ({
    client: sourceReport?.client || client,
    period: { month: Number(month), year: Number(year), label: `${monthLabel} ${year}` },
    status: nextStatus,
    work_completed: sourceReport?.work_completed || completed,
    deliverables: sourceReport?.deliverables || deliverables,
    technical_work: sourceReport?.technical_work || technicalWork,
    revisions_completed: sourceReport?.revisions_completed || revisions,
    pending_tasks: sourceReport?.pending_tasks || pending,
    extra_billable_work: sourceReport?.extra_billable_work || { items: billable, total: billableTotal },
    next_month_plan: sourceReport?.next_month_plan || nextMonthPlan,
    prepared_by: 'Brahmanda Tech',
  })

  const saveSnapshot = (nextStatus, sourceReport = report) => saveReport({
    client_id: Number(clientId),
    report_month: Number(month),
    report_year: Number(year),
    report_content: contentForSave(nextStatus, sourceReport),
    status: nextStatus,
  })

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setReport(null)

    try {
      if (isFallback) throw new Error('The backend API is unavailable. Reports cannot be generated or saved in fallback mode.')
      const generatedReport = await generateReport(clientId, month, year)
      const savedStatus = generatedReport.saved_report?.status || 'Draft'
      setStatus(savedStatus)
      setReport(generatedReport)
      await saveSnapshot(savedStatus, generatedReport)
    } catch (requestError) {
      setError(requestError.message)
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
      await saveSnapshot(nextStatus)
    } catch (requestError) {
      setError(`Could not save report status. ${requestError.message}`)
    } finally {
      setSavingStatus(false)
    }
  }

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const downloadReport = () => {
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
    const listHtml = (items, formatter = (item) => item.title) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(formatter(item))}</li>`).join('')}</ul>` : '<p>None recorded.</p>'
    const completedHtml = completed.length ? `<ul>${completed.map((task) => `<li><strong>${escapeHtml(task.title)}</strong>${attachmentsFor(task).length ? `<ul>${attachmentsFor(task).map((attachment) => `<li><a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.title)}</a></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : '<p>None recorded.</p>'
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(client?.name || 'Client')} - ${monthLabel} ${year}</title><style>body{font-family:Helvetica,Arial,sans-serif;color:#18181b;max-width:800px;margin:48px auto;padding:0 24px;line-height:1.6}header{border-bottom:3px solid #002fa7;padding-bottom:24px;margin-bottom:24px}.brand{color:#002fa7;font-weight:700;letter-spacing:.12em;font-size:12px}h1{margin:8px 0 0;font-size:30px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#52525b;border-top:1px solid #e4e4e7;padding-top:18px;margin-top:22px}li{margin:5px 0}a{color:#002fa7}.total{display:flex;justify-content:space-between;border-top:1px solid #e4e4e7;padding-top:10px;font-weight:700}footer{margin-top:36px;border-top:1px solid #e4e4e7;padding-top:18px;color:#52525b}</style></head><body><header><div class="brand">BRAHMANDA TECH / WORK OS</div><h1>Monthly Client Report</h1><p>${escapeHtml(client?.name || '')} · ${monthLabel} ${year} · ${escapeHtml(status)}</p></header><h2>Work completed</h2>${completedHtml}<h2>Designs and content delivered</h2>${listHtml(deliverables)}<h2>Website and technical work</h2>${listHtml(technicalWork)}<h2>Revisions completed</h2>${listHtml(revisions)}<h2>Pending tasks</h2>${listHtml(pending, (task) => `${task.title} (${task.status})`)}<h2>Extra billable work</h2>${listHtml(billable, (task) => `${task.title}: ${formatMoney(amountFor(task))}`)}<p class="total"><span>Total billable amount</span><span>${escapeHtml(formatMoney(billableTotal))}</span></p><h2>Next month plan</h2>${listHtml(nextMonthPlan, (item) => item)}<footer>Prepared by Brahmanda Tech</footer></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(client?.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}-${String(month).padStart(2, '0')}-report.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <PageHeading />
    <div className="panel p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(180px,1fr)_150px_150px_180px_auto]">
        <Field label="Client"><select className="field" value={clientId} onChange={(event) => { setClientId(event.target.value); setReport(null) }}>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Month"><select className="field" value={month} onChange={(event) => { setMonth(Number(event.target.value)); setReport(null) }}>{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Year"><select className="field" value={year} onChange={(event) => { setYear(Number(event.target.value)); setReport(null) }}>{[2025, 2026, 2027].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Report status"><select className="field" value={status} onChange={(event) => handleStatusChange(event.target.value)} disabled={savingStatus}>{['Draft', 'Pending Review', 'Sent'].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <button className="button-primary self-end" disabled={!clientId || generating} onClick={handleGenerate}><FileText size={16} />{generating ? 'Generating…' : 'Generate report'}</button>
      </div>
      {error && <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>

    {report ? <article id="report-preview" className="mx-auto mt-6 max-w-4xl border border-line bg-white">
      <header className="border-b-4 border-blue p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">Brahmanda Tech / Work OS</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Monthly Client Report</h2><p className="mt-2 text-lg">{client?.name}</p><p className="mt-1 text-sm text-zinc-500">{monthLabel} {year}</p></div>
          <span className="border border-line px-3 py-1.5 text-xs font-semibold">{status}</span>
        </div>
        <div className="no-print mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <button className="button-secondary" onClick={() => window.print()}><Printer size={15} />Export PDF</button>
          <button className="button-secondary" onClick={copyReport}><ClipboardCopy size={15} />{copied ? 'Copied' : 'Copy Report'}</button>
          <button className="button-secondary" onClick={downloadReport}><Download size={15} />Download Report</button>
        </div>
      </header>
      <div className="p-6 sm:p-8">
        <ReportSection title="Work completed">{completed.length ? <ul className="space-y-4">{completed.map((task) => <li key={task.id} className="border-b border-line pb-3"><div className="flex justify-between gap-4"><span className="font-medium">{task.title}</span><span className="text-zinc-500">{task.category}</span></div>{attachmentsFor(task).length > 0 && <div className="mt-2 flex flex-wrap gap-2">{attachmentsFor(task).map((attachment) => <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="border border-blue/20 bg-blue/5 px-2 py-1 text-xs font-semibold text-blue hover:underline">{attachment.title}</a>)}</div>}</li>)}</ul> : <p className="text-zinc-500">No completed work recorded for this month.</p>}</ReportSection>
        <ReportSection title="Designs and content delivered">{deliverables.length ? <ul className="space-y-2">{deliverables.map((task) => <li key={task.id}>{task.title}</li>)}</ul> : <p className="text-zinc-500">No design or content deliverables recorded.</p>}</ReportSection>
        <ReportSection title="Website and technical work">{technicalWork.length ? <ul className="space-y-2">{technicalWork.map((task) => <li key={task.id}>{task.title}</li>)}</ul> : <p className="text-zinc-500">No website or technical work recorded.</p>}</ReportSection>
        <ReportSection title="Revisions completed">{revisions.length ? <ul className="space-y-2">{revisions.map((task) => <li key={task.id}>{task.title}</li>)}</ul> : <p className="text-zinc-500">No completed revisions recorded.</p>}</ReportSection>
        <ReportSection title="Pending tasks">{pending.length ? <div className="space-y-2">{pending.map((task) => <div key={task.id} className="flex items-center justify-between gap-4 border-b border-line pb-2"><span>{task.title}</span><StatusBadge status={task.status} /></div>)}</div> : <p>No pending tasks.</p>}</ReportSection>
        <ReportSection title="Extra billable work">{billable.length ? <div className="space-y-2">{billable.map((task) => <div key={task.id} className="flex justify-between gap-4"><span>{task.title}</span><strong>{formatMoney(amountFor(task))}</strong></div>)}</div> : <p className="text-zinc-500">No extra billable work recorded.</p>}<div className="mt-3 flex justify-between border-t border-line pt-3 text-base"><span>Total billable amount</span><strong>{formatMoney(billableTotal)}</strong></div></ReportSection>
        <ReportSection title="Next month plan"><ul className="list-disc space-y-1 pl-5">{nextMonthPlan.map((item) => <li key={item}>{item}</li>)}</ul></ReportSection>
        <footer className="mt-7 border-t border-line pt-5 text-sm text-zinc-500"><p className="font-semibold text-ink">Prepared by Brahmanda Tech</p><p className="mt-1">Brahmanda Work OS · {status}</p></footer>
      </div>
    </article> : <div className="mt-6"><EmptyState title="Report preview is ready to generate" description="Choose a client, month, and year, then generate a report from PHP API data." /></div>}
  </>
}
