import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleDollarSign,
  ExternalLink, MoreHorizontal, Pencil, ReceiptText, Trash2, X,
} from 'lucide-react'

import { deadlineState, formatDate, formatMoney } from './utils'

const statusStyle = {
  New: 'border-zinc-300 bg-zinc-50 text-zinc-700',
  'In Progress': 'border-blue/20 bg-blue/5 text-blue',
  'Waiting for Client': 'border-amber-200 bg-amber-50 text-amber-800',
  Revision: 'border-red-200 bg-red-50 text-red-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const priorityStyle = {
  Urgent: 'border-red-200 bg-red-50 text-red-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  Medium: 'border-blue/20 bg-blue/5 text-blue',
  Low: 'border-zinc-200 bg-zinc-50 text-zinc-600',
}

export function StatCard({ label, value, change, trend = 'up', icon: Icon }) {
  return (
    <div className="panel group p-5 transition hover:border-zinc-400">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center border border-line text-blue"><Icon size={17} strokeWidth={1.8} /></div>
        {change && <span className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-700' : 'text-zinc-500'}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span>}
      </div>
      <div className="mt-6 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}

export function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center border px-2 py-1 text-[11px] font-semibold ${className}`}>{children}</span>
}

export function StatusBadge({ status }) {
  return <Badge className={statusStyle[status] || statusStyle.New}>{status}</Badge>
}

export function PriorityBadge({ priority }) {
  return <Badge className={priorityStyle[priority] || priorityStyle.Low}>{priority}</Badge>
}

export function DeadlineBadge({ task }) {
  const state = deadlineState(task)
  const styles = {
    Overdue: 'border-red-200 bg-red-50 text-red-700',
    'Due Today': 'border-orange-200 bg-orange-50 text-orange-800',
    'Due Tomorrow': 'border-amber-200 bg-amber-50 text-amber-800',
    'Due This Week': 'border-blue/20 bg-blue/5 text-blue',
  }
  if (!styles[state]) return null
  return <Badge className={styles[state]}>{state}</Badge>
}

export function Modal({ open, title, description, children, onClose, size = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return undefined
    const handler = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`max-h-[94vh] w-full overflow-y-auto border border-zinc-300 bg-white shadow-2xl ${size}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white p-5 sm:p-6">
          <div><h2 className="text-xl font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}</div>
          <button className="ml-4 flex h-9 w-9 items-center justify-center border border-line hover:bg-canvas" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button className="flex h-8 w-8 items-center justify-center text-zinc-400 hover:bg-canvas hover:text-ink" onClick={() => setOpen((value) => !value)} aria-label="Actions"><MoreHorizontal size={18} /></button>
      {open && <div className="absolute right-0 top-9 z-20 w-36 border border-line bg-white p-1 shadow-lg"><button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-canvas" onClick={() => { onEdit(); setOpen(false) }}><Pencil size={14} />Edit</button><button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" onClick={() => { onDelete(); setOpen(false) }}><Trash2 size={14} />Delete</button></div>}
    </div>
  )
}

export function TaskCard({ task, client, onEdit, onDelete, onStatusChange, statuses, compact = false }) {
  return (
    <article className="panel p-4 transition hover:border-zinc-400">
      <div className="flex items-start justify-between gap-3"><PriorityBadge priority={task.priority} /><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>
      <h3 className="mt-3 text-sm font-semibold leading-snug">{task.title}</h3>
      {!compact && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{task.description}</p>}
      <p className="mt-3 text-xs font-medium text-zinc-500">{client?.name || 'Deleted client'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700"><CalendarDays size={12} className="mr-1" />{formatDate(task.deadline)}</Badge>
        <DeadlineBadge task={task} />
        {task.billable && <Badge className="border-blue/20 bg-blue/5 text-blue"><CircleDollarSign size={12} className="mr-1" />{formatMoney(task.amount)}</Badge>}
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <select className="w-full bg-white text-xs font-semibold outline-none" value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value)} aria-label="Change task status">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
      </div>
    </article>
  )
}

export function ClientCard({ client, metrics, onView, onEdit, onDelete }) {
  return (
    <article className="panel p-5 transition hover:border-zinc-400">
      <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: client.color }}>{client.initials}</div><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>
      <button className="mt-5 block text-left text-lg font-semibold hover:text-blue" onClick={onView}>{client.name}</button><p className="mt-1 text-sm text-zinc-500">{client.contact}</p>
      <div className="mt-6 grid grid-cols-2 border-t border-line pt-4"><div><div className="text-lg font-semibold">{metrics.total}</div><div className="text-xs text-zinc-500">Total tasks</div></div><div className="border-l border-line pl-4"><div className="text-lg font-semibold">{metrics.pending}</div><div className="text-xs text-zinc-500">Pending</div></div></div>
      <button onClick={onView} className="mt-5 flex w-full items-center justify-between border-t border-line pt-4 text-sm font-semibold hover:text-blue">View client <ChevronRight size={16} /></button>
    </article>
  )
}

export function EmptyState({ title, description, action, onAction }) {
  return <div className="panel flex min-h-52 flex-col items-center justify-center p-8 text-center"><Check className="text-zinc-300" size={30} /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>{action && <button className="button-primary mt-5" onClick={onAction}>{action}</button>}</div>
}

export function Table({ columns, data, emptyMessage = 'No records found.' }) {
  if (!data.length) return <div className="p-10 text-center text-sm text-zinc-500">{emptyMessage}</div>
  return (
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead><tr className="border-b border-line bg-canvas">{columns.map((column) => <th key={column.key} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{column.label}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={row.id || index} className="border-b border-line last:border-0 hover:bg-zinc-50">{columns.map((column) => <td key={column.key} className="px-4 py-4 text-sm">{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>
  )
}

export function ReportSection({ title, children }) {
  return <section className="border-t border-line py-5 first:border-0 first:pt-0"><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</h3><div className="mt-3 text-sm leading-6">{children}</div></section>
}

export function BillingBadge({ value, type }) {
  const styles = value === 'Paid' || value === 'Sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : value === 'Draft' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
  return <Badge className={styles}>{type === 'invoice' && <ReceiptText size={12} className="mr-1" />}{value}</Badge>
}

export function ProofLink({ href }) {
  if (!href) return <span className="text-zinc-400">Not added</span>
  return <a className="inline-flex items-center gap-1 font-medium text-blue hover:underline" href={href} target="_blank" rel="noreferrer">Open proof <ExternalLink size={13} /></a>
}
