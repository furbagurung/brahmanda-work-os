import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, BarChart3, Bell, BellRing, BriefcaseBusiness, CalendarDays, CalendarRange, CheckCircle2, ChevronDown,
  CircleDollarSign, ClipboardCopy, ClipboardList, Clock3, Command, FileText,
  History, LayoutDashboard, LogOut, Menu, Plus, ReceiptText, Repeat2, Search, Settings, Users, UsersRound, X,
} from 'lucide-react'
import {
  ActionMenu, Badge, BillingBadge, ClientCard, DeadlineBadge, EmptyState, Modal, PriorityBadge,
  ProofLink, ReportSection, StatCard, StatusBadge, Table, TaskCard,
} from './components'
import { CATEGORIES, initialClients, initialTasks, PRIORITIES, TASK_STATUSES } from './data'
import {
  activityFromApi, billingFromApi, clientFromApi, clientToApi, createClient as createClientApi,
  createTask as createTaskApi, createTaskAttachment, deleteClient as deleteClientApi,
  deleteTask as deleteTaskApi, deleteTaskAttachment,
  generateReport as generateReportApi, getActivityLogs, getBillings, getClients, getDailyLogs, getReports, getTasks,
  getTaskAttachments, logFromApi, markTaskCompleted, taskFromApi, taskToApi,
  updateBilling as updateBillingApi, attachmentFromApi, reportFromApi,
  updateClient as updateClientApi, updateTask as updateTaskApi, generateRecurringTasks as generateRecurringTasksApi,
} from './services/api'
import { deadlineState, formatDate, formatMoney, todayDateString } from './utils'
import LoginPage from './LoginPage'
import MonthlyReportsPage from './ReportsPage'
import TeamPage from './TeamPage'
import ClientDetailPage from './ClientDetailPage'
import RemindersPage from './RemindersPage'
import CalendarPage from './CalendarPage'
import GlobalSearch from './GlobalSearch'
import { QuickAddMenu, QuickTaskForm } from './QuickAdd'
import RecurringTasksPage from './RecurringTasksPage'
import { nextRecurrenceDate } from './recurrenceUtils'
import ActivityPage, { ActivityFeed } from './ActivityPage'
import { getCurrentUser, logout, updateCurrentUser } from './services/auth'

const STORAGE_KEY = 'brahmanda-work-os-v2'
const TODAY = todayDateString()
const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Clients', icon: Users },
  { label: 'Tasks', icon: ClipboardList },
  { label: 'Kanban Board', icon: BriefcaseBusiness },
  { label: 'Daily Logs', icon: CalendarDays },
  { label: 'Reminders', icon: BellRing },
  { label: 'Calendar', icon: CalendarRange },
  { label: 'Recurring Tasks', icon: Repeat2 },
  { label: 'Activity', icon: History },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Billing', icon: ReceiptText },
  { label: 'Team', icon: UsersRound },
  { label: 'Settings', icon: Settings },
]

function useWorkspace() {
  const [workspace, setWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : {}
      return {
        clients: parsed.clients || initialClients,
        tasks: parsed.tasks || initialTasks,
        logs: parsed.logs || (parsed.tasks || initialTasks).filter((task) => task.status === 'Completed'),
        billings: parsed.billings || (parsed.tasks || initialTasks).filter((task) => task.billable),
        reports: parsed.reports || [],
        activities: parsed.activities || [],
      }
    } catch {
      return { clients: initialClients, tasks: initialTasks, logs: [], billings: [], reports: [], activities: [] }
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFallback, setIsFallback] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('loading')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  }, [workspace])

  const loadApiData = async () => {
    const [clients, taskRows, logs, billing, reports, activities] = await Promise.all([
      getClients(),
      getTasks(),
      getDailyLogs(),
      getBillings(),
      getReports(),
      getActivityLogs({ limit: 200 }).catch(() => []),
    ])
    const attachments = await Promise.all(taskRows.map(async (task) => [
      String(task.id),
      (await getTaskAttachments(task.id)).map(attachmentFromApi),
    ]))
    const attachmentsByTask = Object.fromEntries(attachments)
    const next = {
      clients: clients.map(clientFromApi),
      tasks: taskRows.map((task) => taskFromApi({ ...task, attachments: attachmentsByTask[String(task.id)] || [] })),
      logs: logs.map(logFromApi),
      billings: (billing.items || []).map(billingFromApi),
      reports: reports.map(reportFromApi),
      activities: activities.map(activityFromApi),
    }
    setWorkspace(next)
    setIsFallback(false)
    setConnectionStatus('connected')
    setError('')
    return next
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        await loadApiData()
      } catch (requestError) {
        if (!active) return
        setIsFallback(true)
        setConnectionStatus('error')
        setError(`API unavailable. Using saved demo data. ${requestError.message}`)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const saveTaskLocal = (task) => setWorkspace((current) => {
    const exists = current.tasks.some((item) => item.id === task.id)
    const previous = current.tasks.find((item) => item.id === task.id)
    const completedAt = task.status === 'Completed'
      ? previous?.completedAt || TODAY
      : ''
    const normalized = {
      ...task,
      amount: task.billable ? Number(task.amount || 0) : 0,
      completedAt,
      paymentStatus: task.billable ? task.paymentStatus || previous?.paymentStatus || 'Unpaid' : undefined,
      invoiceStatus: task.billable ? task.invoiceStatus || previous?.invoiceStatus || 'Not invoiced' : undefined,
    }
    const tasks = exists ? current.tasks.map((item) => item.id === task.id ? normalized : item) : [{ ...normalized, id: normalized.id || `task-${Date.now()}` }, ...current.tasks]
    return {
      ...current,
      tasks,
      logs: tasks.filter((item) => item.status === 'Completed'),
      billings: tasks.filter((item) => item.billable),
    }
  })

  const updateTaskLocal = (id, patch) => setWorkspace((current) => {
    const tasks = current.tasks.map((task) => {
      if (task.id !== id) return task
      const next = { ...task, ...patch }
      if (patch.status === 'Completed' && !task.completedAt) next.completedAt = TODAY
      if (patch.status && patch.status !== 'Completed') next.completedAt = ''
      return next
    })
    return {
      ...current,
      tasks,
      logs: tasks.filter((task) => task.status === 'Completed'),
      billings: tasks.filter((task) => task.billable),
    }
  })

  const runWithFallback = async (apiAction, fallbackAction) => {
    if (isFallback) {
      fallbackAction()
      return
    }
    setError('')
    try {
      await apiAction()
      await loadApiData()
    } catch (requestError) {
      setIsFallback(true)
      setConnectionStatus('error')
      setError(`API request failed. Change saved in demo mode only. ${requestError.message}`)
      fallbackAction()
    }
  }

  const saveTask = async (task) => runWithFallback(
    async () => {
      const exists = workspace.tasks.some((item) => item.id === task.id)
      const current = workspace.tasks.find((item) => item.id === task.id)
      const response = exists
        ? await updateTaskApi(task.id, taskToApi(task))
        : await createTaskApi(taskToApi(task))
      const taskId = exists ? task.id : String(response.id)
      const originalAttachments = current?.attachments || []
      const submittedAttachments = task.attachments || []

      for (const original of originalAttachments) {
        const submitted = submittedAttachments.find((attachment) => attachment.id === original.id)
        if (!submitted || submitted.title !== original.title || submitted.url !== original.url) {
          await deleteTaskAttachment(original.id)
        }
      }

      for (const attachment of submittedAttachments) {
        const original = originalAttachments.find((item) => item.id === attachment.id)
        if (!original || original.title !== attachment.title || original.url !== attachment.url) {
          await createTaskAttachment({
            task_id: Number(taskId),
            attachment_type: attachment.type || 'link',
            title: attachment.title,
            url: attachment.url,
          })
        }
      }
    },
    () => saveTaskLocal(task),
  )

  const updateTask = async (id, patch) => {
    const current = workspace.tasks.find((task) => task.id === id)
    if (!current) return
    await runWithFallback(
      async () => {
        if (patch.status === 'Completed' && current.status !== 'Completed') {
          await markTaskCompleted(id)
        } else if ('paymentStatus' in patch || 'invoiceStatus' in patch) {
          await updateBillingApi(id, {
            payment_status: patch.paymentStatus,
            invoice_status: patch.invoiceStatus,
          })
        } else {
          await updateTaskApi(id, taskToApi({ ...current, ...patch }))
        }
      },
      () => updateTaskLocal(id, patch),
    )
  }

  const deleteTask = async (id) => runWithFallback(
    () => deleteTaskApi(id),
    () => setWorkspace((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id), logs: current.logs.filter((log) => log.taskId !== id), billings: current.billings.filter((billing) => billing.id !== id) })),
  )

  const saveClientLocal = (client) => setWorkspace((current) => {
    const exists = current.clients.some((item) => item.id === client.id)
    const normalized = { ...client, id: client.id || `client-${Date.now()}` }
    return { ...current, clients: exists ? current.clients.map((item) => item.id === client.id ? normalized : item) : [...current.clients, normalized] }
  })

  const saveClient = async (client) => runWithFallback(
    async () => {
      const exists = workspace.clients.some((item) => item.id === client.id)
      if (exists) await updateClientApi(client.id, clientToApi(client))
      else await createClientApi(clientToApi(client))
    },
    () => saveClientLocal(client),
  )

  const deleteClient = async (id) => runWithFallback(
    () => deleteClientApi(id),
    () => setWorkspace((current) => ({ ...current, clients: current.clients.filter((client) => client.id !== id), tasks: current.tasks.filter((task) => task.clientId !== id), logs: current.logs.filter((log) => log.clientId !== id), billings: current.billings.filter((billing) => billing.clientId !== id) })),
  )

  const generateRecurringTasks = async () => {
    const generateLocal = () => {
      const dueTemplates = workspace.tasks.filter((task) => (
        task.isRecurring
        && task.nextOccurrenceDate
        && task.nextOccurrenceDate <= TODAY
        && (!task.recurrenceEndDate || task.nextOccurrenceDate <= task.recurrenceEndDate)
      ))
      if (!dueTemplates.length) return 0
      setWorkspace((current) => {
        const generated = dueTemplates.map((template, index) => ({
          ...template,
          id: `task-${Date.now()}-${index}`,
          deadline: template.nextOccurrenceDate,
          reminderDate: '',
          reminderNote: '',
          isRecurring: false,
          recurrenceType: '',
          recurrenceInterval: 1,
          recurrenceEndDate: '',
          nextOccurrenceDate: '',
          recurringParentId: template.id,
          status: 'New',
          proofLink: '',
          attachments: [],
          completedAt: '',
          paymentStatus: 'Unpaid',
          invoiceStatus: 'Not invoiced',
        }))
        const tasks = current.tasks.map((task) => {
          const template = dueTemplates.find((item) => item.id === task.id)
          if (!template) return task
          const next = nextRecurrenceDate(template.nextOccurrenceDate, template.recurrenceType, template.recurrenceInterval)
          const active = !template.recurrenceEndDate || next <= template.recurrenceEndDate
          return { ...task, isRecurring: active, nextOccurrenceDate: active ? next : '' }
        })
        const allTasks = [...generated, ...tasks]
        return {
          ...current,
          tasks: allTasks,
          logs: allTasks.filter((task) => task.status === 'Completed'),
          billings: allTasks.filter((task) => task.billable),
        }
      })
      return dueTemplates.length
    }

    if (isFallback) return { generated_count: generateLocal() }
    setError('')
    try {
      const response = await generateRecurringTasksApi()
      await loadApiData()
      return response
    } catch (requestError) {
      setIsFallback(true)
      setConnectionStatus('error')
      setError(`Recurring task generation failed. Generated in demo mode only. ${requestError.message}`)
      return { generated_count: generateLocal() }
    }
  }

  const refreshActivities = async () => {
    if (isFallback) return workspace.activities || []
    try {
      const rows = await getActivityLogs({ limit: 200 })
      const activities = rows.map(activityFromApi)
      setWorkspace((current) => ({ ...current, activities }))
      return activities
    } catch {
      return workspace.activities || []
    }
  }

  const resetWorkspace = () => {
    setIsFallback(true)
    setConnectionStatus('fallback')
    setError('Demo mode enabled. Data is stored in this browser only.')
    setWorkspace({ clients: initialClients, tasks: initialTasks, logs: initialTasks.filter((task) => task.status === 'Completed'), billings: initialTasks.filter((task) => task.billable), reports: [], activities: [] })
  }

  return { ...workspace, loading, error, isFallback, connectionStatus, saveTask, updateTask, deleteTask, saveClient, deleteClient, generateRecurringTasks, refreshActivities, resetWorkspace }
}

function Sidebar({ activePage, setActivePage, open, setOpen }) {
  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <button className="flex items-center gap-3" onClick={() => setActivePage('Dashboard')}><span className="flex h-8 w-8 items-center justify-center bg-blue text-white"><Command size={17} /></span><span className="text-sm font-bold tracking-tight">BRAHMANDA <span className="text-blue">OS</span></span></button>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Workspace</p>
          <div className="space-y-1">{navigation.map(({ label, icon: Icon }, index) => <button key={label} onClick={() => { setActivePage(label); setOpen(false) }} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${(activePage === label || (activePage === 'Client Detail' && label === 'Clients')) ? 'bg-blue text-white' : 'text-zinc-600 hover:bg-canvas hover:text-ink'}`}><span className="w-5 text-[10px] tabular-nums opacity-50">{String(index + 1).padStart(2, '0')}</span><Icon size={17} strokeWidth={1.8} /><span className="font-medium">{label}</span></button>)}</div>
        </nav>
        <div className="border-t border-line p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center bg-ink text-xs font-bold text-white">BT</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Brahmanda Tech</p><p className="text-xs text-zinc-500">Agency workspace</p></div><ChevronDown size={15} className="text-zinc-400" /></div></div>
      </aside>
    </>
  )
}

function Topbar({ activePage, setOpen, onOpenSearch, quickAddOpen, setQuickAddOpen, quickAddActions, user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-line bg-white/95 px-4 backdrop-blur md:px-7">
      <button className="mr-3 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      <div className="hidden min-w-0 flex-1 xl:block"><p className="truncate text-sm font-semibold">{activePage}</p><p className="hidden text-xs text-zinc-500 sm:block">Brahmanda Tech / Internal workspace</p></div>
      <button className="flex min-w-0 flex-1 items-center gap-2 border border-line bg-canvas px-3 py-2 text-left text-sm text-zinc-500 hover:border-zinc-400 xl:mx-6 xl:max-w-xl" onClick={onOpenSearch}><Search size={15} className="shrink-0" /><span className="truncate">Search clients, tasks, reports, proofs</span><kbd className="ml-auto hidden border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold sm:block">Ctrl K</kbd></button>
      <div className="relative ml-2 sm:ml-3"><button className="button-primary hidden sm:inline-flex" onClick={() => setQuickAddOpen((value) => !value)}><Plus size={15} />Quick Add<ChevronDown size={14} /></button><button className="flex h-9 w-9 items-center justify-center bg-blue text-white sm:hidden" onClick={() => setQuickAddOpen((value) => !value)} aria-label="Open Quick Add"><Plus size={17} /></button><QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} {...quickAddActions} /></div>
      <button className="relative ml-3 flex h-9 w-9 items-center justify-center border border-line" aria-label="Notifications"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-blue" /></button>
      <div className="ml-3 hidden text-right md:block"><p className="text-xs font-semibold">{user.name}</p><p className="text-[11px] capitalize text-zinc-500">{user.role}</p></div>
      <span className="ml-3 flex h-9 w-9 items-center justify-center bg-ink text-xs font-bold text-white">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
      <button className="ml-2 flex h-9 w-9 items-center justify-center border border-line text-zinc-500 hover:border-zinc-400 hover:text-ink" onClick={onLogout} aria-label="Log out"><LogOut size={16} /></button>
    </header>
  )
}

function PageHeading({ number, title, description, action, onAction }) {
  return <div className="mb-8 flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-start gap-4 sm:gap-5"><span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">{number}</span><div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p></div></div>{action && <button className="button-primary self-start sm:self-auto" onClick={onAction}><Plus size={16} />{action}</button>}</div>
}

function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>
}

const blankTask = (clientId = '') => ({ id: '', clientId, title: '', description: '', category: 'Design', priority: 'Medium', deadline: TODAY, reminderDate: '', reminderNote: '', isRecurring: false, recurrenceType: 'monthly', recurrenceInterval: 1, recurrenceEndDate: '', nextOccurrenceDate: '', recurringParentId: '', status: 'New', proofLink: '', attachments: [], billable: false, amount: 0, assignee: 'AS', completedAt: '', paymentStatus: 'Unpaid', invoiceStatus: 'Not invoiced' })

function TaskForm({ task, clients, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const initial = task || blankTask(clients[0]?.id)
    const attachments = initial.attachments?.length
      ? initial.attachments
      : initial.proofLink
        ? [{ id: '', type: 'link', title: 'Proof link', url: initial.proofLink }]
        : []
    return { ...initial, attachments }
  })
  const [saving, setSaving] = useState(false)
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const addProof = () => setForm((current) => ({ ...current, attachments: [...current.attachments, { id: '', type: 'link', title: '', url: '' }] }))
  const updateProof = (index, key, value) => setForm((current) => ({ ...current, attachments: current.attachments.map((attachment, attachmentIndex) => attachmentIndex === index ? { ...attachment, [key]: value } : attachment) }))
  const removeProof = (index) => setForm((current) => ({ ...current, attachments: current.attachments.filter((_, attachmentIndex) => attachmentIndex !== index) }))
  const submit = async (event) => {
    event.preventDefault()
    const attachments = form.attachments.filter((attachment) => attachment.title.trim() && attachment.url.trim())
    setSaving(true)
    await onSave({ ...form, attachments, proofLink: attachments[0]?.url || '' })
    setSaving(false)
    onClose()
  }
  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Client"><select className="field" value={form.clientId} onChange={(event) => change('clientId', event.target.value)} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
        <Field label="Task title"><input className="field" value={form.title} onChange={(event) => change('title', event.target.value)} required placeholder="What needs to be done?" /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea className="field min-h-24 resize-y" value={form.description} onChange={(event) => change('description', event.target.value)} required /></Field>
        <Field label="Category"><select className="field" value={form.category} onChange={(event) => change('category', event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Priority"><select className="field" value={form.priority} onChange={(event) => change('priority', event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Deadline"><input className="field" type="date" value={form.deadline} onChange={(event) => change('deadline', event.target.value)} /></Field>
        <Field label="Reminder date"><input className="field" type="date" value={form.reminderDate || ''} onChange={(event) => change('reminderDate', event.target.value)} /></Field>
        <Field label="Reminder note" className="sm:col-span-2"><textarea className="field min-h-20 resize-y" value={form.reminderNote || ''} onChange={(event) => change('reminderNote', event.target.value)} placeholder="What needs attention on the reminder date?" /></Field>
        <Field label="Status"><select className="field" value={form.status} onChange={(event) => change('status', event.target.value)}>{TASK_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Assignee initials"><input className="field" value={form.assignee} onChange={(event) => change('assignee', event.target.value.toUpperCase().slice(0, 3))} /></Field>
        <section className="border border-line p-4 sm:col-span-2">
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(form.isRecurring)} onChange={(event) => setForm((current) => ({ ...current, isRecurring: event.target.checked, nextOccurrenceDate: event.target.checked ? current.nextOccurrenceDate || current.deadline || TODAY : current.nextOccurrenceDate }))} className="h-4 w-4 accent-blue" />Recurring task</label>
          <p className="mt-1 text-xs text-zinc-500">Use this task as a template for repeated client work.</p>
          {form.isRecurring && <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <Field label="Frequency"><select className="field" value={form.recurrenceType || 'monthly'} onChange={(event) => change('recurrenceType', event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
            <Field label={`Repeat every X ${form.recurrenceType === 'daily' ? 'days' : form.recurrenceType === 'weekly' ? 'weeks' : 'months'}`}><input className="field" type="number" min="1" value={form.recurrenceInterval || 1} onChange={(event) => change('recurrenceInterval', event.target.value)} required /></Field>
            <Field label="End date (optional)"><input className="field" type="date" value={form.recurrenceEndDate || ''} onChange={(event) => change('recurrenceEndDate', event.target.value)} /></Field>
            <Field label="Next occurrence date"><input className="field" type="date" value={form.nextOccurrenceDate || ''} onChange={(event) => change('nextOccurrenceDate', event.target.value)} required /></Field>
          </div>}
        </section>
        <section className="border border-line p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-4"><div><h3 className="text-sm font-semibold">Proof links</h3><p className="mt-1 text-xs text-zinc-500">Google Drive, design, social post, or website links.</p></div><button type="button" className="button-secondary px-3 py-2" onClick={addProof}><Plus size={14} />Add Proof Link</button></div>
          <div className="mt-4 space-y-3">
            {form.attachments.map((attachment, index) => <div key={`${attachment.id}-${index}`} className="grid gap-3 border-t border-line pt-3 sm:grid-cols-[1fr_1.4fr_auto]"><input className="field" value={attachment.title} onChange={(event) => updateProof(index, 'title', event.target.value)} placeholder="Proof title" required /><input className="field" type="url" value={attachment.url} onChange={(event) => updateProof(index, 'url', event.target.value)} placeholder="https://" required /><button type="button" className="flex h-10 w-10 items-center justify-center border border-line text-zinc-500 hover:border-red-300 hover:text-red-700" onClick={() => removeProof(index)} aria-label="Remove proof link"><X size={16} /></button></div>)}
            {!form.attachments.length && <p className="text-sm text-zinc-400">No proof links added.</p>}
          </div>
        </section>
        <label className="flex items-center gap-3 border border-line p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.billable} onChange={(event) => change('billable', event.target.checked)} className="h-4 w-4 accent-blue" />This is extra billable work</label>
        {form.billable && <Field label="Billable amount"><input className="field" type="number" min="0" value={form.amount} onChange={(event) => change('amount', event.target.value)} required /></Field>}
      </div>
      <div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving} type="submit">{saving ? 'Saving…' : task?.id ? 'Save changes' : 'Create task'}</button></div>
    </form>
  )
}

function ClientForm({ client, onSave, onClose }) {
  const [form, setForm] = useState(client || { id: '', name: '', initials: '', color: '#002FA7', contact: '', email: '', phone: '', servicePackage: '', monthlyFee: 0, startDate: '', status: 'active', notes: '' })
  const [saving, setSaving] = useState(false)
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    const initials = form.initials || form.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    setSaving(true)
    await onSave({ ...form, initials })
    setSaving(false)
    onClose()
  }
  return <form onSubmit={submit}><div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"><Field label="Client name"><input className="field" required value={form.name} onChange={(event) => change('name', event.target.value)} /></Field><Field label="Contact person"><input className="field" required value={form.contact} onChange={(event) => change('contact', event.target.value)} /></Field><Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => change('email', event.target.value)} /></Field><Field label="Phone"><input className="field" value={form.phone} onChange={(event) => change('phone', event.target.value)} /></Field><Field label="Service package"><input className="field" value={form.servicePackage || ''} onChange={(event) => change('servicePackage', event.target.value)} /></Field><Field label="Monthly fee"><input className="field" type="number" min="0" value={form.monthlyFee || 0} onChange={(event) => change('monthlyFee', event.target.value)} /></Field><Field label="Start date"><input className="field" type="date" value={form.startDate || ''} onChange={(event) => change('startDate', event.target.value)} /></Field><Field label="Status"><select className="field" value={String(form.status || 'active').toLowerCase().replace(' ', '_')} onChange={(event) => change('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="on_hold">On hold</option></select></Field><Field label="Initials"><input className="field" maxLength="2" value={form.initials} onChange={(event) => change('initials', event.target.value.toUpperCase())} placeholder="Auto-generated" /></Field><Field label="Brand color"><input className="field h-11 p-1" type="color" value={form.color} onChange={(event) => change('color', event.target.value)} /></Field><Field label="Notes" className="sm:col-span-2"><textarea className="field min-h-24" value={form.notes} onChange={(event) => change('notes', event.target.value)} /></Field></div><div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : client?.id ? 'Save changes' : 'Add client'}</button></div></form>
}

function DeadlineColumn({ title, description, tasks, clients, tone }) {
  const toneClasses = {
    red: 'border-t-red-600',
    orange: 'border-t-orange-500',
    blue: 'border-t-blue',
  }
  return <section className={`border border-line border-t-2 bg-white ${toneClasses[tone]}`}><div className="border-b border-line p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{title}</h3><span className="text-lg font-semibold">{tasks.length}</span></div><p className="mt-1 text-xs text-zinc-500">{description}</p></div><div className="divide-y divide-line">{tasks.slice(0, 4).map((task) => <div className="p-4" key={task.id}><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{clients.find((client) => client.id === task.clientId)?.name || 'Deleted client'} · {formatDate(task.deadline)}</p><div className="mt-2 flex flex-wrap gap-2"><PriorityBadge priority={task.priority} /><DeadlineBadge task={task} /></div></div>)}{!tasks.length && <p className="p-5 text-sm text-zinc-400">No tasks</p>}</div></section>
}

function Dashboard({ clients, tasks, activities, connectionStatus, onNewTask, setActivePage, onEditTask, onDeleteTask, updateTask }) {
  const completed = tasks.filter((task) => task.status === 'Completed')
  const billable = tasks.filter((task) => task.billable)
  const todayTasks = tasks.filter((task) => task.deadline === TODAY)
  const openTasks = tasks.filter((task) => task.status !== 'Completed')
  const overdueTasks = openTasks.filter((task) => deadlineState(task) === 'Overdue').sort((a, b) => a.deadline.localeCompare(b.deadline))
  const dueTodayTasks = openTasks.filter((task) => deadlineState(task) === 'Due Today')
  const dueThisWeekTasks = openTasks.filter((task) => ['Due Tomorrow', 'Due This Week'].includes(deadlineState(task))).sort((a, b) => a.deadline.localeCompare(b.deadline))
  const upcomingTasks = openTasks.filter((task) => deadlineState(task) === 'Upcoming').sort((a, b) => a.deadline.localeCompare(b.deadline))
  const recurringTasks = tasks.filter((task) => task.isRecurring && task.nextOccurrenceDate).sort((a, b) => a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate))
  const recurringDueToday = recurringTasks.filter((task) => task.nextOccurrenceDate === TODAY)
  const recurringUpcoming = recurringTasks.filter((task) => task.nextOccurrenceDate > TODAY).slice(0, 4)
  const stats = [
    ['Active Clients', String(clients.length).padStart(2, '0'), 'Client workspaces', Users],
    ['Today’s Tasks', String(todayTasks.length).padStart(2, '0'), `${todayTasks.filter((task) => task.status !== 'Completed').length} open`, ClipboardList],
    ['Pending Tasks', String(tasks.length - completed.length).padStart(2, '0'), 'Across all clients', Clock3],
    ['Completed', String(completed.length).padStart(2, '0'), 'Stored in daily logs', CheckCircle2],
    ['Billable Work', formatMoney(billable.reduce((sum, task) => sum + Number(task.amount), 0)), `${billable.length} items`, CircleDollarSign],
    ['Reports Ready', String(new Set(completed.map((task) => task.clientId)).size).padStart(2, '0'), 'From completed tasks', FileText],
  ]
  const priorityTasks = tasks.filter((task) => task.status !== 'Completed').slice(0, 4)
  const statusLabel = connectionStatus === 'connected' ? 'Connected to API' : connectionStatus === 'fallback' ? 'Demo/Fallback Mode' : 'API Error'
  const statusClasses = connectionStatus === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : connectionStatus === 'fallback' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'
  return <>
    <PageHeading number="01" title="Agency overview" description="Live workload, delivery, and billable activity from your local workspace." action="Create task" onAction={onNewTask} />
    <div className={`mb-5 flex items-center gap-2 border px-4 py-3 text-sm font-semibold ${statusClasses}`}><span className="h-2 w-2 rounded-full bg-current" />{statusLabel}</div>
    <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label, value, change, Icon]) => <StatCard key={label} label={label} value={value} change={change} icon={Icon} />)}</div>
    <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
      <button className="flex items-center justify-between bg-red-50 p-5 text-left text-red-800 hover:bg-red-100" onClick={() => setActivePage('Tasks')}><div><p className="text-3xl font-semibold">{overdueTasks.length}</p><p className="mt-1 text-sm font-semibold">Overdue tasks</p></div><AlertTriangle size={22} /></button>
      <button className="flex items-center justify-between bg-orange-50 p-5 text-left text-orange-800 hover:bg-orange-100" onClick={() => setActivePage('Tasks')}><div><p className="text-3xl font-semibold">{dueTodayTasks.length}</p><p className="mt-1 text-sm font-semibold">Due today</p></div><CalendarDays size={22} /></button>
      <button className="flex items-center justify-between bg-blue/5 p-5 text-left text-blue hover:bg-blue/10" onClick={() => setActivePage('Tasks')}><div><p className="text-3xl font-semibold">{dueThisWeekTasks.length + upcomingTasks.length}</p><p className="mt-1 text-sm font-semibold">Upcoming deadlines</p></div><Clock3 size={22} /></button>
    </div>
    <section className="mt-8 grid gap-px border border-line bg-line lg:grid-cols-[280px_1fr]">
      <button className="flex items-center justify-between bg-violet-50 p-5 text-left text-violet-800 hover:bg-violet-100" onClick={() => setActivePage('Recurring Tasks')}><div><p className="text-3xl font-semibold">{recurringDueToday.length}</p><p className="mt-1 text-sm font-semibold">Recurring tasks due today</p></div><Repeat2 size={22} /></button>
      <div className="bg-white"><div className="flex items-center justify-between border-b border-line px-5 py-3"><div><h2 className="text-sm font-semibold">Upcoming recurring tasks</h2><p className="mt-1 text-xs text-zinc-500">Next scheduled templates</p></div><button className="text-sm font-semibold text-blue" onClick={() => setActivePage('Recurring Tasks')}>Manage</button></div>{recurringUpcoming.length ? <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">{recurringUpcoming.map((task) => <div className="bg-white p-4" key={task.id}><p className="truncate text-sm font-semibold">{task.title}</p><p className="mt-1 truncate text-xs text-zinc-500">{clients.find((client) => client.id === task.clientId)?.name || 'Deleted client'}</p><p className="mt-3 text-xs font-semibold text-violet-700">{formatDate(task.nextOccurrenceDate, { month: 'short', day: 'numeric' })}</p></div>)}</div> : <p className="p-5 text-sm text-zinc-400">No upcoming recurring tasks.</p>}</div>
    </section>
    <section className="mt-8"><div className="mb-4 flex items-end justify-between border-b border-line pb-3"><div><h2 className="font-semibold">Deadline attention</h2><p className="mt-1 text-xs text-zinc-500">Open client work ordered by urgency</p></div><button className="text-sm font-semibold text-blue" onClick={() => setActivePage('Reminders')}>View reminders</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><DeadlineColumn title="Overdue Tasks" description="Past deadline" tasks={overdueTasks} clients={clients} tone="red" /><DeadlineColumn title="Due Today" description={formatDate(TODAY, { month: 'long', day: 'numeric' })} tasks={dueTodayTasks} clients={clients} tone="orange" /><DeadlineColumn title="Due This Week" description="Next seven days" tasks={dueThisWeekTasks} clients={clients} tone="blue" /><DeadlineColumn title="Upcoming Deadlines" description="Beyond seven days" tasks={upcomingTasks} clients={clients} tone="blue" /></div></section>
    <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_340px]">
      <section className="panel"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Priority work</h2><p className="mt-1 text-xs text-zinc-500">Current tasks requiring attention</p></div><button className="text-sm font-semibold text-blue" onClick={() => setActivePage('Tasks')}>View all</button></div>{priorityTasks.length ? <div className="grid gap-px bg-line md:grid-cols-2">{priorityTasks.map((task) => <TaskCard key={task.id} task={task} client={clients.find((client) => client.id === task.clientId)} compact statuses={TASK_STATUSES} onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} onStatusChange={(id, status) => updateTask(id, { status })} />)}</div> : <EmptyState title="No pending work" description="Create a task to start planning client work." action="Create task" onAction={onNewTask} />}</section>
      <aside className="panel"><div className="border-b border-line p-5"><h2 className="font-semibold">Delivery pulse</h2><p className="mt-1 text-xs text-zinc-500">{formatDate(TODAY, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><div className="divide-y divide-line">{clients.map((client) => { const clientTasks = tasks.filter((task) => task.clientId === client.id); const done = clientTasks.filter((task) => task.status === 'Completed').length; return <div key={client.id} className="p-4"><div className="flex justify-between gap-4"><p className="text-sm font-semibold">{client.name}</p><span className="text-xs text-zinc-500">{done}/{clientTasks.length}</span></div><div className="mt-3 h-1 bg-zinc-100"><div className="h-full bg-blue" style={{ width: `${clientTasks.length ? (done / clientTasks.length) * 100 : 0}%` }} /></div></div>})}</div></aside>
    </div>
    <section className="panel mt-8"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Recent Activity</h2><p className="mt-1 text-xs text-zinc-500">Latest workspace actions</p></div><button className="text-sm font-semibold text-blue" onClick={() => setActivePage('Activity')}>View all</button></div><ActivityFeed activities={(activities || []).slice(0, 5)} compact /></section>
  </>
}

function ClientsPage({ clients, tasks, onNewClient, onEditClient, onDeleteClient, onViewClient }) {
  const metrics = (id) => {
    const list = tasks.filter((task) => task.clientId === id)
    return { total: list.length, completed: list.filter((task) => task.status === 'Completed').length, pending: list.filter((task) => task.status !== 'Completed').length, billable: list.filter((task) => task.billable).reduce((sum, task) => sum + Number(task.amount), 0) }
  }
  return <>
    <PageHeading number="02" title="Clients" description="Client workspaces with task progress, contacts, and billable totals." action="Add client" onAction={onNewClient} />
    {clients.length ? <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">{clients.map((client) => <ClientCard key={client.id} client={client} metrics={metrics(client.id)} onView={() => onViewClient(client.id)} onEdit={() => onEditClient(client)} onDelete={() => onDeleteClient(client.id)} />)}</div> : <EmptyState title="No clients yet." description="Add your first client." action="Add client" onAction={onNewClient} />}
  </>
}

function TasksPage({ clients, tasks, onNewTask, onEditTask, onDeleteTask, updateTask }) {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [deadlineFilter, setDeadlineFilter] = useState('All')
  const filtered = tasks.filter((task) => {
    const client = clients.find((item) => item.id === task.clientId)
    const deadline = deadlineState(task)
    const matchesDeadline = deadlineFilter === 'All'
      || deadline === deadlineFilter
      || (deadlineFilter === 'Due This Week' && ['Due Tomorrow', 'Due This Week'].includes(deadline))
    return (!search || `${task.title} ${task.description} ${client?.name}`.toLowerCase().includes(search.toLowerCase()))
      && (clientFilter === 'All' || task.clientId === clientFilter)
      && (statusFilter === 'All' || task.status === statusFilter)
      && (priorityFilter === 'All' || task.priority === priorityFilter)
      && matchesDeadline
  })
  const columns = [
    { key: 'title', label: 'Task', render: (task) => <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{task.category}</p></div> },
    { key: 'client', label: 'Client', render: (task) => clients.find((client) => client.id === task.clientId)?.name || 'Deleted client' },
    { key: 'priority', label: 'Priority', render: (task) => <PriorityBadge priority={task.priority} /> },
    { key: 'deadline', label: 'Deadline', render: (task) => <div><p>{formatDate(task.deadline)}</p><div className="mt-1"><DeadlineBadge task={task} /></div></div> },
    { key: 'status', label: 'Status', render: (task) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value })}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select> },
    { key: 'billable', label: 'Billable', render: (task) => task.billable ? formatMoney(task.amount) : 'No' },
    { key: 'actions', label: '', render: (task) => <ActionMenu onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} /> },
  ]
  return <>
    <PageHeading number="03" title="Tasks" description="Create, filter, update, and complete all client work from one view." action="Create task" onAction={onNewTask} />
    {!tasks.length ? <EmptyState title="No tasks yet." description="Add your first task." action="Create task" onAction={onNewTask} /> : <div className="panel">
      <div className="grid gap-3 border-b border-line p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(140px,180px))]"><div className="flex items-center border border-line px-3"><Search size={15} className="shrink-0 text-zinc-400" /><input className="w-full px-2 py-2.5 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /></div><select className="field" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option>All</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select className="field" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><select className="field" value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value)}><option>All</option><option>Overdue</option><option>Due Today</option><option>Due This Week</option><option>No Deadline</option></select></div>
      <Table columns={columns} data={filtered} emptyMessage="No tasks match the current filters." />
    </div>}
  </>
}

function KanbanPage({ clients, tasks, onNewTask, onEditTask, onDeleteTask, updateTask }) {
  return <>
    <PageHeading number="04" title="Kanban Board" description="Update task status directly from compact delivery cards." action="Create task" onAction={onNewTask} />
    <div className="flex gap-4 overflow-x-auto pb-4">{TASK_STATUSES.map((status) => { const list = tasks.filter((task) => task.status === status); return <section key={status} className="w-[285px] shrink-0"><div className="mb-3 flex items-center justify-between border-b-2 border-ink pb-3"><h2 className="text-sm font-semibold">{status}</h2><span className="flex h-6 min-w-6 items-center justify-center bg-zinc-200 px-2 text-xs font-semibold">{list.length}</span></div><div className="space-y-3">{list.map((task) => <TaskCard key={task.id} task={task} client={clients.find((client) => client.id === task.clientId)} statuses={TASK_STATUSES} onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} onStatusChange={(id, nextStatus) => updateTask(id, { status: nextStatus })} />)}<button className="flex w-full items-center justify-center gap-2 border border-dashed border-zinc-300 p-3 text-xs font-semibold text-zinc-500 hover:border-blue hover:text-blue" onClick={() => onNewTask({ status })}><Plus size={14} />Add task</button></div></section> })}</div>
  </>
}

function DailyLogsPage({ clients, logs }) {
  const completed = [...logs].sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
  const columns = [
    { key: 'date', label: 'Date', render: (task) => formatDate(task.completedAt || task.deadline, { year: 'numeric', month: 'short', day: 'numeric' }) },
    { key: 'client', label: 'Client', render: (task) => clients.find((client) => client.id === task.clientId)?.name || 'Deleted client' },
    { key: 'title', label: 'Work done', render: (task) => <div><p className="font-semibold">{task.title}</p><p className="mt-1 max-w-md text-xs text-zinc-500">{task.description}</p></div> },
    { key: 'category', label: 'Category' },
    { key: 'proof', label: 'Proof', render: (task) => task.attachments?.length ? <div className="space-y-1">{task.attachments.map((attachment) => <a key={attachment.id || attachment.url} className="block font-medium text-blue hover:underline" href={attachment.url} target="_blank" rel="noreferrer">{attachment.title}</a>)}</div> : <ProofLink href={task.proofLink} /> },
    { key: 'billable', label: 'Billable', render: (task) => task.billable ? <Badge className="border-blue/20 bg-blue/5 text-blue">{formatMoney(task.amount)}</Badge> : <span className="text-zinc-500">No</span> },
  ]
  return <><PageHeading number="05" title="Daily Logs" description="Completed tasks are recorded here automatically when their status changes." /><div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-3"><StatCard label="Completed entries" value={String(completed.length).padStart(2, '0')} change="Auto-generated" icon={CheckCircle2} /><StatCard label="Clients delivered" value={String(new Set(completed.map((task) => task.clientId)).size).padStart(2, '0')} change="In completed work" icon={Users} /><StatCard label="Billable delivered" value={formatMoney(completed.filter((task) => task.billable).reduce((sum, task) => sum + Number(task.amount), 0))} change="Completed only" icon={CircleDollarSign} /></div><div className="panel"><Table columns={columns} data={completed} emptyMessage="Completed tasks will appear here automatically." /></div></>
}

export function LegacyReportsPage({ clients, tasks, isFallback }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [month, setMonth] = useState('2026-06')
  const [generated, setGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reportError, setReportError] = useState('')
  const [apiReport, setApiReport] = useState(null)
  useEffect(() => { if (!clients.some((client) => client.id === clientId)) setClientId(clients[0]?.id || '') }, [clients, clientId])
  const client = clients.find((item) => item.id === clientId)
  const scoped = tasks.filter((task) => task.clientId === clientId)
  const fallbackCompleted = scoped.filter((task) => task.status === 'Completed' && (task.completedAt || task.deadline).startsWith(month))
  const fallbackPending = scoped.filter((task) => task.status !== 'Completed')
  const fallbackBillable = scoped.filter((task) => task.billable)
  const completed = apiReport?.work_completed || fallbackCompleted
  const pending = apiReport?.pending_tasks || fallbackPending
  const billable = apiReport?.extra_billable_work?.items || fallbackBillable
  const deliverables = apiReport?.deliverables || completed.filter((task) => ['Design', 'Content', 'Social Media', 'Campaign', 'Presentation'].includes(task.category))
  const monthLabel = month ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`)) : ''
  const amountFor = (task) => Number(task.billable_amount ?? task.amount ?? 0)
  const reportText = `${client?.name || 'Client'} — ${monthLabel}\n\nWork completed:\n${completed.map((task) => `- ${task.title}`).join('\n') || '- No completed work recorded'}\n\nDesigns/content delivered:\n${deliverables.map((task) => `- ${task.title}`).join('\n') || '- No design or content deliverables recorded'}\n\nPending tasks:\n${pending.map((task) => `- ${task.title} (${task.status})`).join('\n') || '- No pending tasks'}\n\nExtra billable work:\n${billable.map((task) => `- ${task.title}: ${formatMoney(amountFor(task))}`).join('\n') || '- No extra billable work'}\n\nNext month plan:\n- Complete pending deliverables\n- Review campaign performance\n- Confirm next month priorities with the client`
  const generate = async () => {
    setGenerating(true)
    setReportError('')
    setApiReport(null)
    if (!isFallback) {
      try {
        const [year, monthNumber] = month.split('-').map(Number)
        setApiReport(await generateReportApi(clientId, monthNumber, year))
      } catch (requestError) {
        setReportError(`Report API failed. Showing cached task data. ${requestError.message}`)
      }
    }
    setGenerated(true)
    setGenerating(false)
  }
  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return <>
    <PageHeading number="06" title="Reports" description="Generate a client delivery summary from completed and pending workspace tasks." />
    <div className="panel p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><Field label="Client"><select className="field" value={clientId} onChange={(event) => { setClientId(event.target.value); setGenerated(false) }}>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Month"><input className="field" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setGenerated(false) }} /></Field><button className="button-primary self-end" disabled={!clientId || generating} onClick={generate}><FileText size={16} />{generating ? 'Generating…' : 'Generate report'}</button></div>{reportError && <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{reportError}</p>}</div>
    {generated ? <article className="mx-auto mt-6 max-w-4xl border border-line bg-white"><header className="flex flex-col gap-4 border-b border-line p-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue">{monthLabel} client report</p><h2 className="mt-2 text-2xl font-semibold">{client?.name}</h2><p className="mt-1 text-sm text-zinc-500">Prepared by Brahmanda Tech</p></div><button className="button-secondary" onClick={copyReport}><ClipboardCopy size={15} />{copied ? 'Copied' : 'Copy report'}</button></header><div className="p-6">
      <ReportSection title="Work completed">{completed.length ? <ul className="space-y-2">{completed.map((task) => <li key={task.id} className="flex justify-between gap-4 border-b border-line pb-2"><span>{task.title}</span><span className="text-zinc-500">{task.category}</span></li>)}</ul> : <p className="text-zinc-500">No completed work recorded for this month.</p>}</ReportSection>
      <ReportSection title="Designs and content delivered">{deliverables.length ? <p>{deliverables.length} deliverable{deliverables.length === 1 ? '' : 's'} completed: {deliverables.map((task) => task.title).join(', ')}.</p> : <p className="text-zinc-500">No design or content deliverables recorded.</p>}</ReportSection>
      <ReportSection title="Pending tasks">{pending.length ? <div className="space-y-2">{pending.map((task) => <div key={task.id} className="flex items-center justify-between gap-4 border-b border-line pb-2"><span>{task.title}</span><StatusBadge status={task.status} /></div>)}</div> : <p>No pending tasks.</p>}</ReportSection>
      <ReportSection title="Extra billable work">{billable.length ? <div className="space-y-2">{billable.map((task) => <div key={task.id} className="flex justify-between"><span>{task.title}</span><strong>{formatMoney(amountFor(task))}</strong></div>)}<div className="flex justify-between border-t border-line pt-3"><span>Total</span><strong>{formatMoney(apiReport?.extra_billable_work?.total ?? billable.reduce((sum, task) => sum + amountFor(task), 0))}</strong></div></div> : <p>No extra billable work recorded.</p>}</ReportSection>
      <ReportSection title="Next month plan"><ul className="list-disc space-y-1 pl-5">{(apiReport?.next_month_plan || ['Complete pending deliverables and revisions.', 'Review campaign performance and report findings.', 'Confirm next month priorities with the client.']).map((item) => <li key={item}>{item}</li>)}</ul></ReportSection>
    </div></article> : <div className="mt-6"><EmptyState title="Report preview is ready to generate" description="Choose a client and month, then generate a report from the current task data." /></div>}
  </>
}

function BillingPage({ clients, billings, updateTask }) {
  const billable = billings
  const total = billable.reduce((sum, task) => sum + Number(task.amount), 0)
  const paid = billable.filter((task) => task.paymentStatus === 'Paid').reduce((sum, task) => sum + Number(task.amount), 0)
  const columns = [
    { key: 'title', label: 'Billable work', render: (task) => <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{task.clientName || clients.find((client) => client.id === task.clientId)?.name}</p></div> },
    { key: 'amount', label: 'Amount', render: (task) => <span className="font-semibold">{formatMoney(task.amount)}</span> },
    { key: 'payment', label: 'Payment', render: (task) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={task.paymentStatus || 'Unpaid'} onChange={(event) => updateTask(task.id, { paymentStatus: event.target.value })}><option>Unpaid</option><option>Paid</option></select> },
    { key: 'invoice', label: 'Invoice', render: (task) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={task.invoiceStatus || 'Not invoiced'} onChange={(event) => updateTask(task.id, { invoiceStatus: event.target.value })}><option>Not invoiced</option><option>Draft</option><option>Sent</option></select> },
    { key: 'status', label: 'Status', render: (task) => <div className="flex flex-wrap gap-2"><BillingBadge value={task.paymentStatus || 'Unpaid'} /><BillingBadge type="invoice" value={task.invoiceStatus || 'Not invoiced'} /></div> },
  ]
  return <><PageHeading number="07" title="Billing" description="Only billable tasks appear here. Payment and invoice status persist locally." /><div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-3"><StatCard label="Total billable" value={formatMoney(total)} change={`${billable.length} items`} icon={CircleDollarSign} /><StatCard label="Paid" value={formatMoney(paid)} change={`${billable.filter((task) => task.paymentStatus === 'Paid').length} settled`} icon={CheckCircle2} /><StatCard label="Outstanding" value={formatMoney(total - paid)} change={`${billable.filter((task) => task.paymentStatus !== 'Paid').length} unpaid`} icon={Clock3} /></div><div className="panel"><Table columns={columns} data={billable} emptyMessage="No billable tasks have been added." /></div></>
}

function SettingsPage({ resetWorkspace }) {
  return <><PageHeading number="08" title="Settings" description="Workspace preferences and local fallback controls." /><div className="grid gap-6 lg:grid-cols-[240px_1fr]"><nav className="panel h-fit p-2">{['Workspace', 'Team members', 'Task fields', 'Notifications', 'Billing details'].map((item, index) => <button key={item} className={`w-full px-3 py-2.5 text-left text-sm font-medium ${index === 0 ? 'bg-blue text-white' : 'hover:bg-canvas'}`}>{item}</button>)}</nav><section className="panel"><div className="border-b border-line p-6"><h2 className="text-lg font-semibold">Workspace details</h2><p className="mt-1 text-sm text-zinc-500">API data is cached locally and used when the backend is unavailable.</p></div><div className="space-y-5 p-6"><Field label="Workspace name"><input className="field" defaultValue="Brahmanda Tech" /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Timezone"><select className="field" defaultValue="Asia/Kathmandu"><option>Asia/Kathmandu</option></select></Field><Field label="Currency"><select className="field" defaultValue="NPR"><option>NPR — Nepalese Rupee</option></select></Field></div><div className="border-t border-line pt-5"><h3 className="font-semibold">Reset local fallback data</h3><p className="mt-1 text-sm text-zinc-500">Switch to demo mode and restore the original clients and tasks.</p><button className="button-secondary mt-4 text-red-700" onClick={() => window.confirm('Reset local fallback data?') && resetWorkspace()}>Reset dummy data</button></div></div></section></div></>
}

function WorkspaceApp({ user, onLogout, onUserUpdate }) {
  const workspace = useWorkspace()
  const initialClientId = window.location.hash.match(/^#clients\/(.+)$/)?.[1] || ''
  const [activePage, setActivePage] = useState(initialClientId ? 'Client Detail' : 'Dashboard')
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ? decodeURIComponent(initialClientId) : '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [taskModal, setTaskModal] = useState(null)
  const [clientModal, setClientModal] = useState(null)
  const [quickTaskDefaults, setQuickTaskDefaults] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [generatingRecurring, setGeneratingRecurring] = useState(false)
  const [recurringMessage, setRecurringMessage] = useState('')
  const [activityFilters, setActivityFilters] = useState({ user_id: '', client_id: '', module: '', action_type: '', date_from: '', date_to: '' })
  const [activityResults, setActivityResults] = useState([])
  const [recentClientIds, setRecentClientIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('brahmanda-recent-clients') || '[]') } catch { return [] }
  })
  const [recentTaskIds, setRecentTaskIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('brahmanda-recent-tasks') || '[]') } catch { return [] }
  })

  const newTask = (defaults = {}) => setTaskModal({ ...blankTask(workspace.clients[0]?.id), ...defaults })
  const quickTask = useCallback((defaults = {}) => setQuickTaskDefaults({ clientId: selectedClientId || workspace.clients[0]?.id, ...defaults }), [selectedClientId, workspace.clients])
  const deleteTask = (id) => window.confirm('Delete this task? This cannot be undone.') && workspace.deleteTask(id)
  const deleteClient = (id) => window.confirm('Delete this client and all of its tasks?') && workspace.deleteClient(id)
  const navigatePage = (page) => {
    setActivePage(page)
    if (page !== 'Client Detail') {
      setSelectedClientId('')
      if (window.location.hash.startsWith('#clients/')) window.history.pushState({}, '', `${window.location.pathname}${window.location.search}`)
    }
  }
  const openClient = (id) => {
    const nextRecent = [id, ...recentClientIds.filter((item) => item !== id)].slice(0, 6)
    setRecentClientIds(nextRecent)
    localStorage.setItem('brahmanda-recent-clients', JSON.stringify(nextRecent))
    setSelectedClientId(id)
    setActivePage('Client Detail')
    window.history.pushState({ clientId: id }, '', `#clients/${encodeURIComponent(id)}`)
  }
  useEffect(() => {
    const syncRoute = () => {
      const id = window.location.hash.match(/^#clients\/(.+)$/)?.[1]
      if (id) {
        setSelectedClientId(decodeURIComponent(id))
        setActivePage('Client Detail')
      } else {
        setSelectedClientId('')
        setActivePage((current) => current === 'Client Detail' ? 'Clients' : current)
      }
    }
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
    }
  }, [])
  useEffect(() => {
    const shortcuts = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setQuickAddOpen(false)
        return
      }
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        setQuickAddOpen(false)
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        quickTask()
        setSearchOpen(false)
        setQuickAddOpen(false)
      }
    }
    window.addEventListener('keydown', shortcuts)
    return () => window.removeEventListener('keydown', shortcuts)
  }, [quickTask])
  useEffect(() => {
    let active = true
    const load = async () => {
      const params = Object.fromEntries(Object.entries(activityFilters).filter(([, value]) => value))
      if (workspace.isFallback) {
        const filtered = (workspace.activities || []).filter((item) => (
          (!params.user_id || item.userId === params.user_id)
          && (!params.client_id || item.clientId === params.client_id)
          && (!params.module || item.module === params.module)
          && (!params.action_type || item.actionType === params.action_type)
          && (!params.date_from || String(item.createdAt).slice(0, 10) >= params.date_from)
          && (!params.date_to || String(item.createdAt).slice(0, 10) <= params.date_to)
        ))
        if (active) setActivityResults(filtered)
        return
      }
      try {
        const rows = await getActivityLogs({ ...params, limit: 500 })
        if (active) setActivityResults(rows.map(activityFromApi))
      } catch {
        if (active) setActivityResults(workspace.activities || [])
      }
    }
    if (!workspace.loading) load()
    return () => { active = false }
  }, [activityFilters, workspace.activities, workspace.isFallback, workspace.loading])
  const selectedClient = workspace.clients.find((client) => client.id === selectedClientId)
  const saveTaskWithRecent = async (task) => {
    await workspace.saveTask(task)
    if (task.id) {
      const nextRecent = [task.id, ...recentTaskIds.filter((item) => item !== task.id)].slice(0, 6)
      setRecentTaskIds(nextRecent)
      localStorage.setItem('brahmanda-recent-tasks', JSON.stringify(nextRecent))
    }
  }
  const selectSearchResult = (result) => {
    setSearchOpen(false)
    if (result.type === 'Client') openClient(result.id)
    if (result.type === 'Task') setTaskModal(result.task)
    if (result.type === 'Report') navigatePage('Reports')
    if (result.type === 'Proof') window.open(result.url, '_blank', 'noopener,noreferrer')
  }
  const quickAddActions = {
    onAddTask: () => quickTask({ modeTitle: 'Quick add task' }),
    onAddClient: () => setClientModal({}),
    onAddDailyLog: () => quickTask({ modeTitle: 'Add daily log', status: 'Completed', deadline: TODAY }),
    onAddBilling: () => quickTask({ modeTitle: 'Add billing item', billable: true }),
  }
  const generateDueRecurring = async () => {
    setGeneratingRecurring(true)
    setRecurringMessage('')
    const result = await workspace.generateRecurringTasks()
    const count = Number(result?.generated_count || 0)
    setRecurringMessage(count ? `${count} recurring task occurrence${count === 1 ? '' : 's'} generated.` : 'No recurring tasks are currently due.')
    setGeneratingRecurring(false)
  }
  const shared = { clients: workspace.clients, tasks: workspace.tasks, activities: workspace.activities, connectionStatus: workspace.connectionStatus, onNewTask: newTask, onEditTask: setTaskModal, onDeleteTask: deleteTask, updateTask: workspace.updateTask, setActivePage: navigatePage }
  const pages = {
    Dashboard: <Dashboard {...shared} />,
    Clients: <ClientsPage clients={workspace.clients} tasks={workspace.tasks} onNewClient={() => setClientModal({})} onEditClient={setClientModal} onDeleteClient={deleteClient} onViewClient={openClient} />,
    'Client Detail': selectedClient
      ? <ClientDetailPage client={selectedClient} tasks={workspace.tasks} billings={workspace.billings} activities={(workspace.activities || []).filter((activity) => activity.clientId === selectedClient.id).slice(0, 20)} isFallback={workspace.isFallback} onBack={() => navigatePage('Clients')} onNewTask={newTask} onEditTask={setTaskModal} onDeleteTask={deleteTask} updateTask={workspace.updateTask} />
      : <EmptyState title="Client not found" description="This client may have been removed or the link is invalid." action="Back to clients" onAction={() => navigatePage('Clients')} />,
    Tasks: <TasksPage {...shared} />,
    'Kanban Board': <KanbanPage {...shared} />,
    'Daily Logs': <DailyLogsPage clients={workspace.clients} logs={workspace.logs} />,
    Reminders: <RemindersPage clients={workspace.clients} tasks={workspace.tasks} onEditTask={setTaskModal} />,
    Calendar: <CalendarPage clients={workspace.clients} tasks={workspace.tasks} onEditTask={setTaskModal} updateTask={workspace.updateTask} />,
    'Recurring Tasks': <RecurringTasksPage clients={workspace.clients} tasks={workspace.tasks} onEditTask={setTaskModal} updateTask={workspace.updateTask} onGenerate={generateDueRecurring} generating={generatingRecurring} generationMessage={recurringMessage} />,
    Activity: <ActivityPage activities={activityResults} sourceActivities={workspace.activities || []} clients={workspace.clients} filters={activityFilters} setFilters={setActivityFilters} />,
    Reports: <MonthlyReportsPage clients={workspace.clients} tasks={workspace.tasks} isFallback={workspace.isFallback} onActivityRefresh={workspace.refreshActivities} />,
    Billing: <BillingPage clients={workspace.clients} billings={workspace.billings} updateTask={workspace.updateTask} />,
    Team: <TeamPage currentUser={user} onCurrentUserUpdate={onUserUpdate} onActivityRefresh={workspace.refreshActivities} />,
    Settings: <SettingsPage resetWorkspace={workspace.resetWorkspace} />,
  }

  return <div className="min-h-screen bg-canvas"><Sidebar activePage={activePage} setActivePage={navigatePage} open={sidebarOpen} setOpen={setSidebarOpen} /><div className="lg:pl-64"><Topbar activePage={activePage === 'Client Detail' ? selectedClient?.name || 'Client Detail' : activePage} setOpen={setSidebarOpen} onOpenSearch={() => { setSearchOpen(true); setQuickAddOpen(false) }} quickAddOpen={quickAddOpen} setQuickAddOpen={setQuickAddOpen} quickAddActions={quickAddActions} user={user} onLogout={onLogout} /><main className="mx-auto max-w-[1600px] p-4 md:p-7 lg:p-9">{workspace.error && <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{workspace.error}</div>}{workspace.loading ? <div className="panel flex min-h-64 items-center justify-center"><div className="text-center"><div className="mx-auto h-7 w-7 animate-spin border-2 border-zinc-200 border-t-blue" /><p className="mt-3 text-sm text-zinc-500">Loading workspace data…</p></div></div> : pages[activePage]}</main></div>
    <Modal open={Boolean(taskModal)} onClose={() => setTaskModal(null)} title={taskModal?.id ? 'Edit task' : 'Create task'} description="Task changes update every workspace view.">{taskModal && <TaskForm task={taskModal} clients={workspace.clients} onSave={saveTaskWithRecent} onClose={() => setTaskModal(null)} />}</Modal>
    <Modal open={Boolean(quickTaskDefaults)} onClose={() => setQuickTaskDefaults(null)} title={quickTaskDefaults?.modeTitle || 'Quick add task'} description="Create essential daily work without opening the full task form.">{quickTaskDefaults && <QuickTaskForm clients={workspace.clients} defaults={quickTaskDefaults} onSave={saveTaskWithRecent} onClose={() => setQuickTaskDefaults(null)} />}</Modal>
    <Modal open={Boolean(clientModal)} onClose={() => setClientModal(null)} title={clientModal?.id ? 'Edit client' : 'Add client'} description="Create a client workspace for tasks, reports, and billing.">{clientModal && <ClientForm client={clientModal.id ? clientModal : null} onSave={workspace.saveClient} onClose={() => setClientModal(null)} />}</Modal>
    <GlobalSearch open={searchOpen} clients={workspace.clients} tasks={workspace.tasks} reports={workspace.reports || []} recentClientIds={recentClientIds} recentTaskIds={recentTaskIds} onClose={() => setSearchOpen(false)} onSelect={selectSearchResult} />
  </div>
}

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser())

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  const handleUserUpdate = (updatedUser) => {
    updateCurrentUser(updatedUser)
    setUser(updatedUser)
  }

  return <WorkspaceApp user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
}
