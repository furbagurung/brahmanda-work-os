import { Activity, Filter } from 'lucide-react'

import { Badge, EmptyState } from './components'
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

export function ActivityBadge({ action }) {
  return <Badge className={actionStyles[action] || 'border-zinc-200 bg-zinc-50 text-zinc-700'}>{String(action).replaceAll('_', ' ')}</Badge>
}

export function ActivityFeed({ activities, compact = false }) {
  if (!activities.length) return <EmptyState title="No activity recorded" description="Activity will appear after actions are performed." />
  return <div className="divide-y divide-line">{activities.map((item) => <article className={`relative grid gap-3 ${compact ? 'p-4' : 'p-5 before:absolute before:bottom-0 before:left-10 before:top-0 before:w-px before:bg-line sm:grid-cols-[40px_minmax(0,1fr)_auto]'}`} key={item.id}>
    {!compact && <span className="relative z-[1] flex h-10 w-10 items-center justify-center border border-line bg-white text-blue"><Activity size={16} /></span>}
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.userName}</p><ActivityBadge action={item.actionType} /><Badge className="border-zinc-200 bg-white text-zinc-600">{item.module}</Badge></div><p className="mt-2 text-sm leading-6 text-zinc-700">{item.description}</p>{item.itemTitle && <p className="mt-1 text-xs font-medium text-zinc-500">{item.itemTitle}{item.clientName ? ` · ${item.clientName}` : ''}</p>}{!compact && (item.oldValue || item.newValue) && <details className="mt-3 border border-line bg-canvas p-3 text-xs text-zinc-600"><summary className="cursor-pointer font-semibold">View changes</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{item.oldValue && <div><p className="mb-1 font-bold uppercase tracking-wider text-zinc-400">Before</p><pre className="overflow-x-auto whitespace-pre-wrap font-sans">{typeof item.oldValue === 'string' ? item.oldValue : JSON.stringify(item.oldValue, null, 2)}</pre></div>}{item.newValue && <div><p className="mb-1 font-bold uppercase tracking-wider text-zinc-400">After</p><pre className="overflow-x-auto whitespace-pre-wrap font-sans">{typeof item.newValue === 'string' ? item.newValue : JSON.stringify(item.newValue, null, 2)}</pre></div>}</div></details>}</div>
    <time className="text-xs text-zinc-400">{formatActivityDate(item.createdAt)}</time>
  </article>)}</div>
}

export default function ActivityPage({ activities, sourceActivities = activities, clients, filters, setFilters }) {
  const users = [...new Map(sourceActivities.filter((item) => item.userId).map((item) => [item.userId, { id: item.userId, name: item.userName }])).values()]
  const modules = [...new Set(sourceActivities.map((item) => item.module))].sort()
  const actions = [...new Set(sourceActivities.map((item) => item.actionType))].sort()
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return <>
    <div className="mb-8 flex items-start gap-4 border-b border-line pb-7 sm:gap-5"><span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">09</span><div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Activity</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Audit history for important workspace actions.</p></div></div>
    <section className="mb-5 border border-line bg-white"><div className="flex items-center gap-2 border-b border-line px-4 py-3"><Filter size={15} className="text-blue" /><h2 className="text-sm font-semibold">Filters</h2></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
      <select className="field" value={filters.user_id} onChange={(event) => change('user_id', event.target.value)}><option value="">All users</option>{users.map((user) => <option key={user.id || user.name} value={user.id}>{user.name}</option>)}</select>
      <select className="field" value={filters.client_id} onChange={(event) => change('client_id', event.target.value)}><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      <select className="field" value={filters.module} onChange={(event) => change('module', event.target.value)}><option value="">All modules</option>{modules.map((module) => <option key={module}>{module}</option>)}</select>
      <select className="field" value={filters.action_type} onChange={(event) => change('action_type', event.target.value)}><option value="">All actions</option>{actions.map((action) => <option key={action}>{action.replaceAll('_', ' ')}</option>)}</select>
      <input className="field" type="date" value={filters.date_from} onChange={(event) => change('date_from', event.target.value)} aria-label="Activity date from" />
      <input className="field" type="date" value={filters.date_to} onChange={(event) => change('date_to', event.target.value)} aria-label="Activity date to" />
    </div></section>
    <section className="panel"><ActivityFeed activities={activities} /></section>
  </>
}
