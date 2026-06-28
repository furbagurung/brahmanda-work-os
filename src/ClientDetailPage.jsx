import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardList,
  Download, ExternalLink, FileText, Mail, Phone, Plus, RefreshCw,
} from 'lucide-react'

import {
  ActionMenu, Badge, BillingBadge, DeadlineBadge, EmptyState, PriorityBadge, ProofLink,
  StatusBadge, Table,
} from './components'
import { PRIORITIES, TASK_STATUSES } from './data'
import { getReports } from './services/api'
import { formatDate, formatMoney } from './utils'
import { ActivityFeed } from './ActivityPage'
import ReportShareManager from './ReportShareManager'

const TABS = ['Overview', 'Tasks', 'Completed Work', 'Billing', 'Reports', 'Proof Links', 'Activity']

const displayStatus = (status) => String(status || 'active')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase())

const monthName = (month) => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
}).format(new Date(`2026-${String(month).padStart(2, '0')}-01T00:00:00Z`))

function DetailItem({ label, children }) {
  return <div className="border-t border-zinc-100 pt-3"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</dt><dd className="mt-1.5 text-sm font-semibold text-zinc-700">{children || 'Not added'}</dd></div>
}

function SummaryCard({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(24,24,27,0.035)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums text-zinc-900">{value}</p><p className="mt-1 text-xs font-semibold text-zinc-500">{label}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/10 text-blue"><Icon size={16} strokeWidth={1.8} /></span></div></div>
}

function ProofList({ task }) {
  if (task.attachments?.length) {
    return <div className="space-y-1.5">{task.attachments.map((attachment) => <a key={attachment.id || attachment.url} className="flex items-center gap-1.5 font-medium text-blue hover:underline" href={attachment.url} target="_blank" rel="noreferrer">{attachment.title}<ExternalLink size={13} /></a>)}</div>
  }
  return <ProofLink href={task.proofLink} />
}

const firstTaskImage = (task) => task.attachments?.find((attachment) => (
  attachment.isImage
  || Number(attachment.is_image) === 1
  || String(attachment.mimeType || attachment.mime_type || '').startsWith('image/')
))

export default function ClientDetailPage({
  client,
  tasks,
  billings,
  activities = [],
  isFallback,
  onBack,
  onNewTask,
  onEditTask,
  onDeleteTask,
  updateTask,
}) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')
  const [viewingReport, setViewingReport] = useState(null)

  const clientTasks = useMemo(() => tasks.filter((task) => task.clientId === client.id), [client.id, tasks])
  const completedTasks = clientTasks.filter((task) => task.status === 'Completed')
  const clientBillings = billings.filter((billing) => billing.clientId === client.id)
  const billableTotal = clientBillings.reduce((sum, billing) => sum + Number(billing.amount), 0)
  const filteredTasks = clientTasks.filter((task) => (
    (statusFilter === 'All' || task.status === statusFilter)
    && (priorityFilter === 'All' || task.priority === priorityFilter)
  ))

  const loadReports = useCallback(async () => {
    if (isFallback) {
      setReports([])
      return
    }
    setReportsLoading(true)
    setReportsError('')
    try {
      const data = await getReports({ client_id: client.id })
      setReports(Array.isArray(data) ? data : [])
    } catch (error) {
      setReportsError(error.message)
    } finally {
      setReportsLoading(false)
    }
  }, [client.id, isFallback])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const downloadReport = (report) => {
    const content = typeof report.report_content === 'string'
      ? report.report_content
      : JSON.stringify(report.report_content, null, 2)
    const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${client.name}-${report.report_year}-${String(report.report_month).padStart(2, '0')}-report.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const taskColumns = [
    { key: 'thumbnail', label: '', render: (task) => firstTaskImage(task) ? <img className="h-11 w-14 rounded-lg border border-zinc-200 object-cover" src={firstTaskImage(task).url} alt="" /> : null },
    { key: 'title', label: 'Task', render: (task) => <div><p className="font-semibold">{task.title}</p><p className="mt-1 max-w-md text-xs text-zinc-500">{task.category || 'No category'} · {task.assignedUserName || 'Unassigned'}</p>{task.checklistTotal > 0 && <p className="mt-1 text-[11px] text-zinc-500">Checklist {task.checklistCompleted}/{task.checklistTotal}</p>}</div> },
    { key: 'priority', label: 'Priority', render: (task) => <PriorityBadge priority={task.priority} /> },
    { key: 'deadline', label: 'Deadline', render: (task) => <div><p>{formatDate(task.deadline, { year: 'numeric', month: 'short', day: 'numeric' })}</p><div className="mt-1"><DeadlineBadge task={task} /></div></div> },
    { key: 'status', label: 'Status', render: (task) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value })}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select> },
    { key: 'actions', label: '', render: (task) => <ActionMenu onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} /> },
  ]

  const completedColumns = [
    { key: 'thumbnail', label: '', render: (task) => firstTaskImage(task) ? <img className="h-11 w-14 rounded-lg border border-zinc-200 object-cover" src={firstTaskImage(task).url} alt="" /> : null },
    { key: 'title', label: 'Completed work', render: (task) => <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{task.category || 'No category'} · {task.assignedUserName || 'Unassigned'}</p></div> },
    { key: 'date', label: 'Completion date', render: (task) => formatDate(task.completedAt, { year: 'numeric', month: 'short', day: 'numeric' }) },
    { key: 'proof', label: 'Proof links', render: (task) => <ProofList task={task} /> },
    { key: 'actions', label: '', render: (task) => <ActionMenu onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} /> },
  ]

  const billingColumns = [
    { key: 'title', label: 'Billable work', render: (billing) => <div><p className="font-semibold">{billing.title}</p><p className="mt-1 text-xs text-zinc-500">{formatDate(billing.deadline, { year: 'numeric', month: 'short', day: 'numeric' })}</p></div> },
    { key: 'amount', label: 'Amount', render: (billing) => <span className="font-semibold">{formatMoney(billing.amount)}</span> },
    { key: 'payment', label: 'Payment', render: (billing) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={billing.paymentStatus || 'Unpaid'} onChange={(event) => updateTask(billing.id, { paymentStatus: event.target.value })}><option>Unpaid</option><option>Paid</option></select> },
    { key: 'invoice', label: 'Invoice', render: (billing) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={billing.invoiceStatus || 'Not invoiced'} onChange={(event) => updateTask(billing.id, { invoiceStatus: event.target.value })}><option>Not invoiced</option><option>Draft</option><option>Sent</option></select> },
    { key: 'status', label: 'Status', render: (billing) => <div className="flex flex-wrap gap-2"><BillingBadge value={billing.paymentStatus || 'Unpaid'} /><BillingBadge type="invoice" value={billing.invoiceStatus || 'Not invoiced'} /></div> },
  ]

  const summary = [
    ['Total tasks', clientTasks.length, ClipboardList],
    ['Completed tasks', completedTasks.length, CheckCircle2],
    ['Pending tasks', clientTasks.length - completedTasks.length, CalendarDays],
    ['Revision tasks', clientTasks.filter((task) => task.status === 'Revision').length, RefreshCw],
    ['Billable amount', formatMoney(billableTotal), CircleDollarSign],
    ['Reports generated', reports.length, FileText],
  ]

  return <>
    <button className="mb-5 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 shadow-sm transition hover:border-blue/20 hover:text-blue" onClick={onBack}><ArrowLeft size={16} />Back to clients</button>

    <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_14px_40px_rgba(24,24,27,0.06)]">
      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg" style={{ backgroundColor: client.color }}>{client.initials}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{client.name}</h1><Badge className="border-blue/20 bg-blue/5 text-blue">{displayStatus(client.status)}</Badge></div>
              <p className="mt-2 text-sm text-zinc-500">{client.servicePackage || 'No service package added'}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
                <span className="font-semibold text-ink">{client.contact || 'No contact person'}</span>
                {client.phone && <a className="inline-flex items-center gap-1.5 hover:text-blue" href={`tel:${client.phone}`}><Phone size={14} />{client.phone}</a>}
                {client.email && <a className="inline-flex items-center gap-1.5 hover:text-blue" href={`mailto:${client.email}`}><Mail size={14} />{client.email}</a>}
              </div>
            </div>
          </div>
          <p className="mt-7 border-t border-line pt-5 text-sm leading-6 text-zinc-600">{client.notes || 'No client notes added.'}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 sm:p-7">
          <DetailItem label="Monthly fee">{formatMoney(client.monthlyFee)}</DetailItem>
          <DetailItem label="Start date">{client.startDate ? formatDate(client.startDate, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not added'}</DetailItem>
          <DetailItem label="Contact person">{client.contact}</DetailItem>
          <DetailItem label="Service package">{client.servicePackage}</DetailItem>
        </dl>
      </div>
    </section>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{summary.map(([label, value, icon]) => <SummaryCard key={label} label={label} value={value} icon={icon} />)}</div>

    <div className="mt-7 overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white p-1.5 shadow-sm">
      <div className="flex min-w-max gap-1">{TABS.map((tab) => <button key={tab} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab ? 'bg-blue text-white shadow-[0_5px_16px_rgba(0,47,167,0.18)]' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
    </div>

    <div className="mt-5">
      {activeTab === 'Overview' && <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Recent tasks</h2><p className="mt-1 text-xs text-zinc-500">Latest work for this client</p></div><button className="button-secondary px-3 py-2" onClick={() => onNewTask({ clientId: client.id })}><Plus size={14} />Add task</button></div>{clientTasks.length ? <div className="divide-y divide-line">{clientTasks.slice(0, 6).map((task) => <div key={task.id} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{formatDate(task.deadline)} · {task.priority} · {task.assignedUserName || 'Unassigned'}</p><div className="mt-2"><DeadlineBadge task={task} /></div></div><StatusBadge status={task.status} /></div>)}</div> : <EmptyState title="No client tasks" description="Add the first task for this client." action="Add task" onAction={() => onNewTask({ clientId: client.id })} />}</section>
        <section className="panel p-5"><h2 className="font-semibold">Account summary</h2><dl className="mt-5 space-y-4"><DetailItem label="Service package">{client.servicePackage}</DetailItem><DetailItem label="Monthly fee">{formatMoney(client.monthlyFee)}</DetailItem><DetailItem label="Start date">{client.startDate ? formatDate(client.startDate, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not added'}</DetailItem><DetailItem label="Billing status">{clientBillings.some((item) => item.paymentStatus !== 'Paid') ? 'Outstanding items' : clientBillings.length ? 'Paid' : 'No billable work'}</DetailItem></dl></section>
      </div>}

      {activeTab === 'Tasks' && <section className="panel"><div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between"><div className="grid gap-3 sm:grid-cols-2"><select className="field min-w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select className="field min-w-44" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></div><button className="button-primary" onClick={() => onNewTask({ clientId: client.id })}><Plus size={15} />Add task</button></div><Table columns={taskColumns} data={filteredTasks} emptyMessage="No tasks match the selected filters." /></section>}

      {activeTab === 'Completed Work' && <section className="panel"><Table columns={completedColumns} data={completedTasks} emptyMessage="No completed work has been recorded for this client." /></section>}

      {activeTab === 'Billing' && <><div className="mb-4 flex items-end justify-between border-b border-line pb-4"><div><p className="text-sm text-zinc-500">Total billable amount</p><p className="mt-1 text-2xl font-semibold">{formatMoney(billableTotal)}</p></div><p className="text-sm text-zinc-500">{clientBillings.length} item{clientBillings.length === 1 ? '' : 's'}</p></div><section className="panel"><Table columns={billingColumns} data={clientBillings} emptyMessage="No billable tasks have been added for this client." /></section></>}

      {activeTab === 'Reports' && <section className="panel">
        <div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Generated reports</h2><p className="mt-1 text-xs text-zinc-500">Saved monthly client reports</p></div><button className="button-secondary px-3 py-2" onClick={loadReports} disabled={reportsLoading}><RefreshCw size={14} className={reportsLoading ? 'animate-spin' : ''} />Refresh</button></div>
        {reportsError && <p className="m-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{reportsError}</p>}
        {reports.length ? <div className="divide-y divide-line">{reports.map((report) => <div key={report.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{monthName(report.report_month)} {report.report_year}</p><div className="mt-2 flex items-center gap-2"><BillingBadge value={report.status} /><span className="text-xs text-zinc-500">Created {formatDate(String(report.created_at).slice(0, 10), { year: 'numeric', month: 'short', day: 'numeric' })}</span></div></div><div className="flex gap-2"><button className="button-secondary px-3 py-2" onClick={() => setViewingReport(report)}><FileText size={14} />View report</button>{report.report_content && <button className="button-secondary px-3 py-2" onClick={() => downloadReport(report)}><Download size={14} />Download</button>}</div></div>)}</div> : !reportsLoading && <EmptyState title="No generated reports" description={isFallback ? 'Saved report history is unavailable in fallback mode.' : 'Generate and save a report from the Reports page.'} />}
        {!isFallback && <div className="border-t border-line"><div className="p-5"><h3 className="font-semibold">Report share links</h3><p className="mt-1 text-xs text-zinc-500">Active, inactive, and expired client portal links.</p></div><ReportShareManager clientId={client.id} allowCreate={false} /></div>}
      </section>}

      {activeTab === 'Proof Links' && <section className="panel">{clientTasks.some((task) => task.attachments?.length || task.proofLink) ? <div className="divide-y divide-line">{clientTasks.filter((task) => task.attachments?.length || task.proofLink).map((task) => <div key={task.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(220px,0.7fr)_1fr]"><div><h3 className="text-sm font-semibold">{task.title}</h3><p className="mt-1 text-xs text-zinc-500">{task.status}</p></div><ProofList task={task} /></div>)}</div> : <EmptyState title="No proof links" description="Proof links added to this client's tasks will appear here." />}</section>}
      {activeTab === 'Activity' && <section className="panel"><ActivityFeed activities={activities} /></section>}
    </div>

    {viewingReport && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && setViewingReport(null)}><section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-line bg-white"><header className="flex items-start justify-between border-b border-line p-5"><div><h2 className="text-lg font-semibold">{monthName(viewingReport.report_month)} {viewingReport.report_year} report</h2><p className="mt-1 text-sm text-zinc-500">{client.name}</p></div><button className="button-secondary px-3 py-2" onClick={() => setViewingReport(null)}>Close</button></header><pre className="whitespace-pre-wrap p-5 font-sans text-sm leading-6 text-zinc-700">{typeof viewingReport.report_content === 'string' ? viewingReport.report_content : JSON.stringify(viewingReport.report_content, null, 2)}</pre></section></div>}
  </>
}
