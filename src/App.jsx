import { useEffect, useState } from 'react'
import {
  BarChart3, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronDown,
  CircleDollarSign, ClipboardCopy, ClipboardList, Clock3, Command, FileText,
  LayoutDashboard, Menu, Plus, ReceiptText, Search, Settings, Users, X,
} from 'lucide-react'
import {
  ActionMenu, Badge, BillingBadge, ClientCard, EmptyState, Modal, PriorityBadge,
  ProofLink, ReportSection, StatCard, StatusBadge, Table, TaskCard,
} from './components'
import { CATEGORIES, initialClients, initialTasks, PRIORITIES, TASK_STATUSES } from './data'
import {
  billingFromApi, clientFromApi, clientToApi, createClient as createClientApi,
  createTask as createTaskApi, deleteClient as deleteClientApi, deleteTask as deleteTaskApi,
  generateReport as generateReportApi, getBillings, getClients, getDailyLogs, getTasks,
  logFromApi, markTaskCompleted, taskFromApi, taskToApi, updateBilling as updateBillingApi,
  updateClient as updateClientApi, updateTask as updateTaskApi,
} from './services/api'
import { formatDate, formatMoney } from './utils'

const STORAGE_KEY = 'brahmanda-work-os-v2'
const TODAY = '2026-06-25'
const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Clients', icon: Users },
  { label: 'Tasks', icon: ClipboardList },
  { label: 'Kanban Board', icon: BriefcaseBusiness },
  { label: 'Daily Logs', icon: CalendarDays },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Billing', icon: ReceiptText },
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
      }
    } catch {
      return { clients: initialClients, tasks: initialTasks, logs: [], billings: [] }
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
    const [clients, tasks, logs, billing] = await Promise.all([
      getClients(),
      getTasks(),
      getDailyLogs(),
      getBillings(),
    ])
    const next = {
      clients: clients.map(clientFromApi),
      tasks: tasks.map(taskFromApi),
      logs: logs.map(logFromApi),
      billings: (billing.items || []).map(billingFromApi),
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
      if (exists) await updateTaskApi(task.id, taskToApi(task))
      else await createTaskApi(taskToApi(task))
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

  const resetWorkspace = () => {
    setIsFallback(true)
    setConnectionStatus('fallback')
    setError('Demo mode enabled. Data is stored in this browser only.')
    setWorkspace({ clients: initialClients, tasks: initialTasks, logs: initialTasks.filter((task) => task.status === 'Completed'), billings: initialTasks.filter((task) => task.billable) })
  }

  return { ...workspace, loading, error, isFallback, connectionStatus, saveTask, updateTask, deleteTask, saveClient, deleteClient, resetWorkspace }
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
          <div className="space-y-1">{navigation.map(({ label, icon: Icon }, index) => <button key={label} onClick={() => { setActivePage(label); setOpen(false) }} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${activePage === label ? 'bg-blue text-white' : 'text-zinc-600 hover:bg-canvas hover:text-ink'}`}><span className="w-5 text-[10px] tabular-nums opacity-50">{String(index + 1).padStart(2, '0')}</span><Icon size={17} strokeWidth={1.8} /><span className="font-medium">{label}</span></button>)}</div>
        </nav>
        <div className="border-t border-line p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center bg-ink text-xs font-bold text-white">BT</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Brahmanda Tech</p><p className="text-xs text-zinc-500">Agency workspace</p></div><ChevronDown size={15} className="text-zinc-400" /></div></div>
      </aside>
    </>
  )
}

function Topbar({ activePage, setOpen, onNewTask }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-line bg-white/95 px-4 backdrop-blur md:px-7">
      <button className="mr-3 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{activePage}</p><p className="hidden text-xs text-zinc-500 sm:block">Brahmanda Tech / Internal workspace</p></div>
      <button className="button-primary hidden sm:inline-flex" onClick={onNewTask}><Plus size={15} />New task</button>
      <button className="relative ml-3 flex h-9 w-9 items-center justify-center border border-line" aria-label="Notifications"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-blue" /></button>
      <span className="ml-3 flex h-9 w-9 items-center justify-center bg-ink text-xs font-bold text-white">AS</span>
    </header>
  )
}

function PageHeading({ number, title, description, action, onAction }) {
  return <div className="mb-8 flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-start gap-4 sm:gap-5"><span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">{number}</span><div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p></div></div>{action && <button className="button-primary self-start sm:self-auto" onClick={onAction}><Plus size={16} />{action}</button>}</div>
}

function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>
}

const blankTask = (clientId = '') => ({ id: '', clientId, title: '', description: '', category: 'Design', priority: 'Medium', deadline: TODAY, status: 'New', proofLink: '', billable: false, amount: 0, assignee: 'AS', completedAt: '', paymentStatus: 'Unpaid', invoiceStatus: 'Not invoiced' })

function TaskForm({ task, clients, onSave, onClose }) {
  const [form, setForm] = useState(task || blankTask(clients[0]?.id))
  const [saving, setSaving] = useState(false)
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    await onSave(form)
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
        <Field label="Deadline"><input className="field" type="date" value={form.deadline} onChange={(event) => change('deadline', event.target.value)} required /></Field>
        <Field label="Status"><select className="field" value={form.status} onChange={(event) => change('status', event.target.value)}>{TASK_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Proof link"><input className="field" type="url" value={form.proofLink} onChange={(event) => change('proofLink', event.target.value)} placeholder="https://" /></Field>
        <Field label="Assignee initials"><input className="field" value={form.assignee} onChange={(event) => change('assignee', event.target.value.toUpperCase().slice(0, 3))} /></Field>
        <label className="flex items-center gap-3 border border-line p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.billable} onChange={(event) => change('billable', event.target.checked)} className="h-4 w-4 accent-blue" />This is extra billable work</label>
        {form.billable && <Field label="Billable amount"><input className="field" type="number" min="0" value={form.amount} onChange={(event) => change('amount', event.target.value)} required /></Field>}
      </div>
      <div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving} type="submit">{saving ? 'Saving…' : task?.id ? 'Save changes' : 'Create task'}</button></div>
    </form>
  )
}

function ClientForm({ client, onSave, onClose }) {
  const [form, setForm] = useState(client || { id: '', name: '', initials: '', color: '#002FA7', contact: '', email: '', phone: '', status: 'Active', notes: '' })
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
  return <form onSubmit={submit}><div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"><Field label="Client name"><input className="field" required value={form.name} onChange={(event) => change('name', event.target.value)} /></Field><Field label="Contact / team"><input className="field" required value={form.contact} onChange={(event) => change('contact', event.target.value)} /></Field><Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => change('email', event.target.value)} /></Field><Field label="Phone"><input className="field" value={form.phone} onChange={(event) => change('phone', event.target.value)} /></Field><Field label="Initials"><input className="field" maxLength="2" value={form.initials} onChange={(event) => change('initials', event.target.value.toUpperCase())} placeholder="Auto-generated" /></Field><Field label="Brand color"><input className="field h-11 p-1" type="color" value={form.color} onChange={(event) => change('color', event.target.value)} /></Field><Field label="Notes" className="sm:col-span-2"><textarea className="field min-h-24" value={form.notes} onChange={(event) => change('notes', event.target.value)} /></Field></div><div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : client?.id ? 'Save changes' : 'Add client'}</button></div></form>
}

function Dashboard({ clients, tasks, connectionStatus, onNewTask, setActivePage, onEditTask, onDeleteTask, updateTask }) {
  const completed = tasks.filter((task) => task.status === 'Completed')
  const billable = tasks.filter((task) => task.billable)
  const todayTasks = tasks.filter((task) => task.deadline === TODAY)
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
    <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_340px]">
      <section className="panel"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Priority work</h2><p className="mt-1 text-xs text-zinc-500">Current tasks requiring attention</p></div><button className="text-sm font-semibold text-blue" onClick={() => setActivePage('Tasks')}>View all</button></div>{priorityTasks.length ? <div className="grid gap-px bg-line md:grid-cols-2">{priorityTasks.map((task) => <TaskCard key={task.id} task={task} client={clients.find((client) => client.id === task.clientId)} compact statuses={TASK_STATUSES} onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} onStatusChange={(id, status) => updateTask(id, { status })} />)}</div> : <EmptyState title="No pending work" description="Create a task to start planning client work." action="Create task" onAction={onNewTask} />}</section>
      <aside className="panel"><div className="border-b border-line p-5"><h2 className="font-semibold">Delivery pulse</h2><p className="mt-1 text-xs text-zinc-500">{formatDate(TODAY, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><div className="divide-y divide-line">{clients.map((client) => { const clientTasks = tasks.filter((task) => task.clientId === client.id); const done = clientTasks.filter((task) => task.status === 'Completed').length; return <div key={client.id} className="p-4"><div className="flex justify-between gap-4"><p className="text-sm font-semibold">{client.name}</p><span className="text-xs text-zinc-500">{done}/{clientTasks.length}</span></div><div className="mt-3 h-1 bg-zinc-100"><div className="h-full bg-blue" style={{ width: `${clientTasks.length ? (done / clientTasks.length) * 100 : 0}%` }} /></div></div>})}</div></aside>
    </div>
  </>
}

function ClientsPage({ clients, tasks, onNewClient, onEditClient, onDeleteClient }) {
  const [selected, setSelected] = useState(null)
  const metrics = (id) => {
    const list = tasks.filter((task) => task.clientId === id)
    return { total: list.length, completed: list.filter((task) => task.status === 'Completed').length, pending: list.filter((task) => task.status !== 'Completed').length, billable: list.filter((task) => task.billable).reduce((sum, task) => sum + Number(task.amount), 0) }
  }
  const selectedMetrics = selected ? metrics(selected.id) : null
  return <>
    <PageHeading number="02" title="Clients" description="Client workspaces with task progress, contacts, and billable totals." action="Add client" onAction={onNewClient} />
    {clients.length ? <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">{clients.map((client) => <ClientCard key={client.id} client={client} metrics={metrics(client.id)} onView={() => setSelected(client)} onEdit={() => onEditClient(client)} onDelete={() => onDeleteClient(client.id)} />)}</div> : <EmptyState title="No clients yet." description="Add your first client." action="Add client" onAction={onNewClient} />}
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || ''} description="Client workspace summary">
      {selected && <div className="p-5 sm:p-6"><div className="grid gap-px border border-line bg-line sm:grid-cols-4">{[['Total tasks', selectedMetrics.total], ['Completed', selectedMetrics.completed], ['Pending', selectedMetrics.pending], ['Billable', formatMoney(selectedMetrics.billable)]].map(([label, value]) => <div key={label} className="bg-white p-4"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-zinc-500">{label}</p></div>)}</div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contact</p><p className="mt-2 text-sm font-semibold">{selected.contact}</p><p className="mt-1 text-sm text-zinc-500">{selected.email}</p><p className="mt-1 text-sm text-zinc-500">{selected.phone}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Client notes</p><p className="mt-2 text-sm leading-6 text-zinc-600">{selected.notes || 'No notes added.'}</p></div></div><div className="mt-6 border-t border-line pt-5"><h3 className="font-semibold">Recent tasks</h3><div className="mt-3 divide-y divide-line border border-line">{tasks.filter((task) => task.clientId === selected.id).slice(0, 5).map((task) => <div key={task.id} className="flex items-center justify-between gap-4 p-3"><div><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{formatDate(task.deadline)}</p></div><StatusBadge status={task.status} /></div>)}</div></div></div>}
    </Modal>
  </>
}

function TasksPage({ clients, tasks, onNewTask, onEditTask, onDeleteTask, updateTask }) {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const filtered = tasks.filter((task) => {
    const client = clients.find((item) => item.id === task.clientId)
    return (!search || `${task.title} ${task.description} ${client?.name}`.toLowerCase().includes(search.toLowerCase()))
      && (clientFilter === 'All' || task.clientId === clientFilter)
      && (statusFilter === 'All' || task.status === statusFilter)
      && (priorityFilter === 'All' || task.priority === priorityFilter)
  })
  const columns = [
    { key: 'title', label: 'Task', render: (task) => <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{task.category}</p></div> },
    { key: 'client', label: 'Client', render: (task) => clients.find((client) => client.id === task.clientId)?.name || 'Deleted client' },
    { key: 'priority', label: 'Priority', render: (task) => <PriorityBadge priority={task.priority} /> },
    { key: 'deadline', label: 'Deadline', render: (task) => formatDate(task.deadline) },
    { key: 'status', label: 'Status', render: (task) => <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value })}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select> },
    { key: 'billable', label: 'Billable', render: (task) => task.billable ? formatMoney(task.amount) : 'No' },
    { key: 'actions', label: '', render: (task) => <ActionMenu onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} /> },
  ]
  return <>
    <PageHeading number="03" title="Tasks" description="Create, filter, update, and complete all client work from one view." action="Create task" onAction={onNewTask} />
    {!tasks.length ? <EmptyState title="No tasks yet." description="Add your first task." action="Create task" onAction={onNewTask} /> : <div className="panel">
      <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(140px,180px))]"><div className="flex items-center border border-line px-3"><Search size={15} className="shrink-0 text-zinc-400" /><input className="w-full px-2 py-2.5 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /></div><select className="field" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option>All</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select className="field" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></div>
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
    { key: 'proof', label: 'Proof', render: (task) => <ProofLink href={task.proofLink} /> },
    { key: 'billable', label: 'Billable', render: (task) => task.billable ? <Badge className="border-blue/20 bg-blue/5 text-blue">{formatMoney(task.amount)}</Badge> : <span className="text-zinc-500">No</span> },
  ]
  return <><PageHeading number="05" title="Daily Logs" description="Completed tasks are recorded here automatically when their status changes." /><div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-3"><StatCard label="Completed entries" value={String(completed.length).padStart(2, '0')} change="Auto-generated" icon={CheckCircle2} /><StatCard label="Clients delivered" value={String(new Set(completed.map((task) => task.clientId)).size).padStart(2, '0')} change="In completed work" icon={Users} /><StatCard label="Billable delivered" value={formatMoney(completed.filter((task) => task.billable).reduce((sum, task) => sum + Number(task.amount), 0))} change="Completed only" icon={CircleDollarSign} /></div><div className="panel"><Table columns={columns} data={completed} emptyMessage="Completed tasks will appear here automatically." /></div></>
}

function ReportsPage({ clients, tasks, isFallback }) {
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

export default function App() {
  const workspace = useWorkspace()
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [taskModal, setTaskModal] = useState(null)
  const [clientModal, setClientModal] = useState(null)

  const newTask = (defaults = {}) => setTaskModal({ ...blankTask(workspace.clients[0]?.id), ...defaults })
  const deleteTask = (id) => window.confirm('Delete this task? This cannot be undone.') && workspace.deleteTask(id)
  const deleteClient = (id) => window.confirm('Delete this client and all of its tasks?') && workspace.deleteClient(id)
  const shared = { clients: workspace.clients, tasks: workspace.tasks, connectionStatus: workspace.connectionStatus, onNewTask: newTask, onEditTask: setTaskModal, onDeleteTask: deleteTask, updateTask: workspace.updateTask, setActivePage }
  const pages = {
    Dashboard: <Dashboard {...shared} />,
    Clients: <ClientsPage clients={workspace.clients} tasks={workspace.tasks} onNewClient={() => setClientModal({})} onEditClient={setClientModal} onDeleteClient={deleteClient} />,
    Tasks: <TasksPage {...shared} />,
    'Kanban Board': <KanbanPage {...shared} />,
    'Daily Logs': <DailyLogsPage clients={workspace.clients} logs={workspace.logs} />,
    Reports: <ReportsPage clients={workspace.clients} tasks={workspace.tasks} isFallback={workspace.isFallback} />,
    Billing: <BillingPage clients={workspace.clients} billings={workspace.billings} updateTask={workspace.updateTask} />,
    Settings: <SettingsPage resetWorkspace={workspace.resetWorkspace} />,
  }

  return <div className="min-h-screen bg-canvas"><Sidebar activePage={activePage} setActivePage={setActivePage} open={sidebarOpen} setOpen={setSidebarOpen} /><div className="lg:pl-64"><Topbar activePage={activePage} setOpen={setSidebarOpen} onNewTask={() => newTask()} /><main className="mx-auto max-w-[1600px] p-4 md:p-7 lg:p-9">{workspace.error && <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{workspace.error}</div>}{workspace.loading ? <div className="panel flex min-h-64 items-center justify-center"><div className="text-center"><div className="mx-auto h-7 w-7 animate-spin border-2 border-zinc-200 border-t-blue" /><p className="mt-3 text-sm text-zinc-500">Loading workspace data…</p></div></div> : pages[activePage]}</main></div>
    <Modal open={Boolean(taskModal)} onClose={() => setTaskModal(null)} title={taskModal?.id ? 'Edit task' : 'Create task'} description="Task changes update every workspace view.">{taskModal && <TaskForm task={taskModal} clients={workspace.clients} onSave={workspace.saveTask} onClose={() => setTaskModal(null)} />}</Modal>
    <Modal open={Boolean(clientModal)} onClose={() => setClientModal(null)} title={clientModal?.id ? 'Edit client' : 'Add client'} description="Create a client workspace for tasks, reports, and billing.">{clientModal && <ClientForm client={clientModal.id ? clientModal : null} onSave={workspace.saveClient} onClose={() => setClientModal(null)} />}</Modal>
  </div>
}
