import { ChevronDown, Filter } from 'lucide-react'

import { Badge, EmptyState, PageHeader } from './components'
import { formatActivityDate } from './activityUtils'

const actionStyles = {
  created: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  added: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  generated: 'border-blue/20 bg-blue/5 text-blue',
  updated: 'border-amber-200 bg-amber-50 text-amber-800',
  status_updated: 'border-amber-200 bg-amber-50 text-amber-800',
  payment_changed: 'border-violet-200 bg-violet-50 text-violet-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  deleted: 'border-red-200 bg-red-50 text-red-700',
  deactivated: 'border-red-200 bg-red-50 text-red-700',
  login: 'border-blue/20 bg-blue/5 text-blue',
  logout: 'border-zinc-200 bg-zinc-50 text-zinc-600',
}

const fieldLabels = {
  status: 'Status', task_status: 'Status', deadline: 'Deadline', due_date: 'Deadline',
  reminder_date: 'Reminder date', assigned_user_id: 'Assigned user',
  assigned_user_name: 'Assigned user', assignee: 'Assigned user', priority: 'Priority',
  billable: 'Billable', is_billable: 'Billable', amount: 'Billable amount',
  billable_amount: 'Billable amount', payment_status: 'Payment status',
  invoice_status: 'Invoice status', title: 'Title', name: 'Name', email: 'Email',
  role: 'Role', client_name: 'Client',
}

const keyAliases = {
  assignedUserName: 'assigned_user_name', assignedUserId: 'assigned_user_id',
  paymentStatus: 'payment_status', invoiceStatus: 'invoice_status',
  billableAmount: 'billable_amount', reminderDate: 'reminder_date', clientName: 'client_name',
}

const parseValue = (value) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return { value } }
}

const humanValue = (key, value) => {
  if (value === null || value === undefined || value === '') return key.includes('assigned') ? 'Unassigned' : 'Not set'
  if (['amount', 'billable_amount'].includes(key)) return `Rs ${Number(value || 0).toLocaleString('en-US')}`
  if (key.includes('date') || key === 'deadline') {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  }
  if (typeof value === 'boolean' || value === 0 || value === 1) return value === true || value === 1 ? 'Yes' : 'No'
  if (typeof value === 'object') return value.name || value.title || 'Updated'
  return String(value).replaceAll('_', ' ')
}

const readableChanges = (item) => {
  const before = parseValue(item.oldValue)
  const after = parseValue(item.newValue)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const hasAssigneeName = keys.some((key) => ['assigned_user_name', 'assignedUserName'].includes(key))
  return keys
    .filter((key) => fieldLabels[keyAliases[key] || key])
    .filter((key) => !(hasAssigneeName && ['assigned_user_id', 'assignedUserId'].includes(key)))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => {
      const normalized = keyAliases[key] || key
      return `${fieldLabels[normalized]} changed from ${humanValue(normalized, before[key])} to ${humanValue(normalized, after[key])}`
    })
}

const groupFor = (value) => {
  const date = new Date(`${String(value).replace(' ', 'T')}Z`)
  const now = new Date()
  const local = (target) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(target)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return local(date) === local(now) ? 'Today' : local(date) === local(yesterday) ? 'Yesterday' : 'Earlier'
}

export function ActivityBadge({ action }) {
  return <Badge className={actionStyles[action] || 'border-zinc-200 bg-zinc-50 text-zinc-700'}>{String(action).replaceAll('_', ' ')}</Badge>
}

function ActivityItem({ item, compact }) {
  const changes = readableChanges(item)
  const initials = (item.userName || 'System').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <article className={`relative grid gap-3 ${compact ? 'p-4' : 'px-5 py-5 sm:grid-cols-[44px_minmax(0,1fr)_auto]'}`}>
    {!compact && <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-xs font-bold text-blue ring-4 ring-white">{initials}</span>}
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-zinc-900">{item.userName || 'System'}</p><ActivityBadge action={item.actionType} /><Badge className="border-zinc-200 bg-white text-zinc-600">{item.module}</Badge>{item.clientName && <span className="text-xs font-medium text-zinc-400">{item.clientName}</span>}</div>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
      {item.itemTitle && <p className="mt-1 text-xs font-semibold text-zinc-800">{item.itemTitle}</p>}
      {changes.length > 0 && <ul className="mt-3 space-y-1.5">{changes.map((change) => <li key={change} className="flex gap-2 text-xs leading-5 text-zinc-600"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue" />{change}</li>)}</ul>}
      {!compact && (item.oldValue || item.newValue) && <details className="group mt-3 rounded-xl border border-zinc-200 bg-zinc-50/70 text-xs text-zinc-600"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 font-semibold text-zinc-500">View technical details<ChevronDown size={14} className="transition group-open:rotate-180" /></summary><div className="grid gap-3 border-t border-zinc-200 p-3 sm:grid-cols-2">{item.oldValue && <div><p className="mb-1 font-bold uppercase tracking-wider text-zinc-400">Before</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-[10px]">{typeof item.oldValue === 'string' ? item.oldValue : JSON.stringify(item.oldValue, null, 2)}</pre></div>}{item.newValue && <div><p className="mb-1 font-bold uppercase tracking-wider text-zinc-400">After</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-[10px]">{typeof item.newValue === 'string' ? item.newValue : JSON.stringify(item.newValue, null, 2)}</pre></div>}</div></details>}
    </div>
    <time className="text-xs font-medium text-zinc-400">{formatActivityDate(item.createdAt)}</time>
  </article>
}

export function ActivityFeed({ activities, compact = false }) {
  if (!activities.length) return <EmptyState title="No activity recorded" description="Activity will appear after actions are performed." />
  if (compact) return <div className="divide-y divide-zinc-100">{activities.map((item) => <ActivityItem key={item.id} item={item} compact />)}</div>
  const groups = activities.reduce((result, item) => {
    const group = groupFor(item.createdAt)
    if (!result[group]) result[group] = []
    result[group].push(item)
    return result
  }, {})
  return <div>{['Today', 'Yesterday', 'Earlier'].filter((group) => groups[group]?.length).map((group) => <section key={group} className="border-b border-zinc-100 last:border-0"><div className="flex items-center gap-3 bg-zinc-50/70 px-5 py-3"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{group}</span><span className="h-px flex-1 bg-zinc-200" /><span className="text-[10px] font-bold text-zinc-400">{groups[group].length}</span></div><div className="relative divide-y divide-zinc-100 before:absolute before:bottom-5 before:left-10 before:top-5 before:w-px before:bg-zinc-200">{groups[group].map((item) => <ActivityItem key={item.id} item={item} />)}</div></section>)}</div>
}

export default function ActivityPage({ activities, sourceActivities = activities, clients, filters, setFilters }) {
  const users = [...new Map(sourceActivities.filter((item) => item.userId).map((item) => [item.userId, { id: item.userId, name: item.userName }])).values()]
  const modules = [...new Set(sourceActivities.map((item) => item.module))].sort()
  const actions = [...new Set(sourceActivities.map((item) => item.actionType))].sort()
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const controlClass = 'rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-600 shadow-sm outline-none focus:border-blue/50 focus:ring-4 focus:ring-blue/10'

  return <>
    <PageHeader eyebrow="Workspace history" title="Activity" description="A readable audit trail of important actions and field-level changes." />
    <section className="mb-5 rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-4 shadow-[0_8px_30px_rgba(24,24,27,0.035)]"><div className="mb-3 flex items-center gap-2"><Filter size={15} className="text-blue" /><h2 className="text-sm font-semibold text-zinc-900">Filter activity</h2></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
      <select className={controlClass} value={filters.user_id} onChange={(event) => change('user_id', event.target.value)}><option value="">All users</option>{users.map((user) => <option key={user.id || user.name} value={user.id}>{user.name}</option>)}</select>
      <select className={controlClass} value={filters.client_id} onChange={(event) => change('client_id', event.target.value)}><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      <select className={controlClass} value={filters.module} onChange={(event) => change('module', event.target.value)}><option value="">All modules</option>{modules.map((module) => <option key={module}>{module}</option>)}</select>
      <select className={controlClass} value={filters.action_type} onChange={(event) => change('action_type', event.target.value)}><option value="">All actions</option>{actions.map((action) => <option key={action}>{action.replaceAll('_', ' ')}</option>)}</select>
      <input className={controlClass} type="date" value={filters.date_from} onChange={(event) => change('date_from', event.target.value)} aria-label="Activity date from" />
      <input className={controlClass} type="date" value={filters.date_to} onChange={(event) => change('date_to', event.target.value)} aria-label="Activity date to" />
    </div></section>
    <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_10px_34px_rgba(24,24,27,0.05)]"><ActivityFeed activities={activities} /></section>
  </>
}
