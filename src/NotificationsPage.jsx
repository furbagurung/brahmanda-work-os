import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, BellRing, CalendarDays, Check, CheckCircle2, CircleDollarSign,
  FileText, MessageSquare, Repeat2, Trash2, UserRound,
} from 'lucide-react'

import { Badge, Button, EmptyState, PageHeader } from './components'
import { formatDate, todayDateString } from './utils'

const NOTIFICATION_TYPES = [
  'overdue_task', 'due_today', 'reminder', 'assigned_task', 'comment_added',
  'report_ready', 'report_shared', 'recurring_task_generated', 'unpaid_billing', 'system',
]

const typeMeta = {
  overdue_task: [AlertTriangle, 'border-l-red-600', 'bg-red-50 text-red-700'],
  due_today: [CalendarDays, 'border-l-orange-500', 'bg-orange-50 text-orange-800'],
  reminder: [BellRing, 'border-l-orange-500', 'bg-orange-50 text-orange-800'],
  assigned_task: [UserRound, 'border-l-blue', 'bg-blue/5 text-blue'],
  comment_added: [MessageSquare, 'border-l-blue', 'bg-blue/5 text-blue'],
  report_ready: [CheckCircle2, 'border-l-emerald-600', 'bg-emerald-50 text-emerald-700'],
  report_shared: [FileText, 'border-l-emerald-600', 'bg-emerald-50 text-emerald-700'],
  recurring_task_generated: [Repeat2, 'border-l-blue', 'bg-blue/5 text-blue'],
  unpaid_billing: [CircleDollarSign, 'border-l-red-600', 'bg-red-50 text-red-700'],
  system: [BellRing, 'border-l-zinc-400', 'bg-zinc-100 text-zinc-700'],
}

const labelForType = (type) => String(type || 'system').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function groupLabel(dateTime) {
  const date = String(dateTime).slice(0, 10)
  const today = todayDateString()
  const yesterdayDate = new Date(`${today}T00:00:00`)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`
  return date === today ? 'Today' : date === yesterday ? 'Yesterday' : 'Earlier'
}

export function NotificationItem({ notification, compact = false, onOpen, onRead, onDelete }) {
  const [Icon, rail, iconStyle] = typeMeta[notification.type] || typeMeta.system
  const unread = Number(notification.is_read) !== 1
  return <article className={`group relative border-l-2 ${rail} ${unread ? 'bg-white' : 'bg-canvas/40'} transition hover:bg-canvas`}>
    <button className={`grid w-full grid-cols-[36px_minmax(0,1fr)] gap-3 text-left ${compact ? 'px-4 py-3' : 'px-5 py-4 pr-14'}`} onClick={() => onOpen(notification)}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconStyle}`}><Icon size={16} /></span>
      <span className="min-w-0">
        <span className="flex items-start justify-between gap-3"><span className={`block text-sm ${unread ? 'font-semibold text-ink' : 'font-medium text-zinc-600'}`}>{notification.title}</span>{unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue" />}</span>
        <span className={`mt-1 block text-xs leading-5 text-zinc-500 ${compact ? 'line-clamp-2' : ''}`}>{notification.message}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400"><span>{formatDate(String(notification.created_at).slice(0, 10), { month: 'short', day: 'numeric' })}</span>{notification.client_name && <span>· {notification.client_name}</span>}{!compact && <Badge className="border-zinc-200 bg-white text-zinc-500">{labelForType(notification.type)}</Badge>}</span>
      </span>
    </button>
    {!compact && <div className="absolute right-3 top-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">{unread && <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white hover:text-blue" onClick={() => onRead(notification.id)} aria-label="Mark notification as read"><Check size={14} /></button>}<button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white hover:text-red-700" onClick={() => onDelete(notification.id)} aria-label="Delete notification"><Trash2 size={14} /></button></div>}
  </article>
}

export function NotificationBell({ notifications, open, setOpen, onOpen, onReadAll, onViewAll }) {
  const ref = useRef(null)
  const unread = notifications.filter((notification) => Number(notification.is_read) !== 1).length
  useEffect(() => {
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [setOpen])
  return <div className="relative ml-1" ref={ref}>
    <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-zinc-500 shadow-sm hover:border-zinc-400 hover:text-ink" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}><BellRing size={17} />{unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <section className="fixed inset-x-3 top-16 z-50 max-h-[75vh] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px]">
      <header className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="text-sm font-semibold">Notifications</h2><p className="mt-0.5 text-[11px] text-zinc-500">{unread} unread</p></div><button className="text-xs font-semibold text-blue disabled:text-zinc-400" disabled={!unread} onClick={onReadAll}>Mark all read</button></header>
      <div className="max-h-[55vh] divide-y divide-line overflow-y-auto">{notifications.length ? notifications.slice(0, 7).map((notification) => <NotificationItem key={notification.id} compact notification={notification} onOpen={(item) => { setOpen(false); onOpen(item) }} />) : <p className="p-8 text-center text-sm text-zinc-500">No notifications yet.</p>}</div>
      <button className="flex w-full items-center justify-center border-t border-line bg-canvas px-4 py-3 text-xs font-semibold text-blue hover:bg-zinc-100" onClick={() => { setOpen(false); onViewAll() }}>View all notifications</button>
    </section>}
  </div>
}

export default function NotificationsPage({ notifications, clients, onOpen, onRead, onReadAll, onDelete, onGenerate, generating }) {
  const [readFilter, setReadFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [clientFilter, setClientFilter] = useState('All')
  const filtered = notifications.filter((notification) => (
    (readFilter === 'All' || (readFilter === 'Unread' ? Number(notification.is_read) !== 1 : Number(notification.is_read) === 1))
    && (typeFilter === 'All' || notification.type === typeFilter)
    && (priorityFilter === 'All' || notification.priority === priorityFilter)
    && (clientFilter === 'All' || String(notification.client_id) === clientFilter)
  ))
  const grouped = useMemo(() => filtered.reduce((result, notification) => {
    const group = groupLabel(notification.created_at)
    result[group] = [...(result[group] || []), notification]
    return result
  }, {}), [filtered])
  const unread = notifications.filter((notification) => Number(notification.is_read) !== 1).length

  return <>
    <PageHeader number="10" title="Notifications" description="Deadline, assignment, report, billing, and system updates for your account." actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!unread} onClick={onReadAll}><Check size={15} />Mark all read</Button><Button disabled={generating} onClick={onGenerate}><Repeat2 size={15} />{generating ? 'Checking…' : 'Check now'}</Button></div>} />

    <div className="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <select className="field" value={readFilter} onChange={(event) => setReadFilter(event.target.value)}><option>All</option><option>Unread</option><option>Read</option></select>
      <select className="field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All</option>{NOTIFICATION_TYPES.map((type) => <option key={type} value={type}>{labelForType(type)}</option>)}</select>
      <select className="field" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select>
      <select className="field" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option>All</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
    </div>

    {filtered.length ? <div className="space-y-5">{['Today', 'Yesterday', 'Earlier'].map((group) => grouped[group]?.length ? <section className="panel" key={group}><header className="flex items-center justify-between border-b border-line bg-canvas/70 px-5 py-3"><h2 className="text-sm font-semibold">{group}</h2><span className="text-xs tabular-nums text-zinc-500">{grouped[group].length}</span></header><div className="divide-y divide-line">{grouped[group].map((notification) => <NotificationItem key={notification.id} notification={notification} onOpen={onOpen} onRead={onRead} onDelete={onDelete} />)}</div></section> : null)}</div> : <EmptyState title="No notifications match these filters" description="Change the filters or check for current deadline and billing notifications." />}
  </>
}
