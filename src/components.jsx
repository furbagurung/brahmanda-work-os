import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleDollarSign,
  ExternalLink, ListChecks, MoreHorizontal, Pencil, ReceiptText, Repeat2, Trash2, UserRound, X,
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
    <div className="panel group p-5 transition duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue/15 bg-blue/5 text-blue"><Icon size={18} strokeWidth={1.8} /></div>
        {change && <span className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-700' : 'text-zinc-500'}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span>}
      </div>
      <div className="mt-6 text-3xl font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}

export function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold leading-none ${className}`}>{children}</span>
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

export function RecurringBadge({ task }) {
  if (!task.isRecurring && !task.recurringParentId) return null
  return <Badge className={task.isRecurring ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}><Repeat2 size={12} className="mr-1" />{task.isRecurring ? 'Recurring' : 'Generated'}</Badge>
}

export function Modal({ open, title, description, children, onClose, size = 'max-w-2xl' }) {
  const closeButtonRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const handler = (event) => event.key === 'Escape' && onClose()
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-zinc-300 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl ${size}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white/95 p-5 backdrop-blur sm:p-6">
          <div><h2 id="modal-title" className="text-xl font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}</div>
          <button ref={closeButtonRef} className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-zinc-500 hover:bg-canvas hover:text-ink" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
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
      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-canvas hover:text-ink" onClick={() => setOpen((value) => !value)} aria-label="Open actions"><MoreHorizontal size={18} /></button>
      {open && <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-line bg-white p-1 shadow-xl"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas" onClick={() => { onEdit(); setOpen(false) }}><Pencil size={14} />Edit</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" onClick={() => { onDelete(); setOpen(false) }}><Trash2 size={14} />Delete</button></div>}
    </div>
  )
}

export function TaskCard({ task, client, onEdit, onDelete, onStatusChange, statuses, compact = false }) {
  return (
    <article className="panel p-4 transition duration-150 hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3"><PriorityBadge priority={task.priority} /><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>
      <h3 className="mt-3 text-sm font-semibold leading-snug">{task.title}</h3>
      {!compact && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{task.description}</p>}
      <p className="mt-3 text-xs font-medium text-zinc-500">{client?.name || 'Deleted client'}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><UserRound size={12} />{task.assignedUserName || 'Unassigned'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700"><CalendarDays size={12} className="mr-1" />{formatDate(task.deadline)}</Badge>
        <DeadlineBadge task={task} />
        <RecurringBadge task={task} />
        {task.billable && <Badge className="border-blue/20 bg-blue/5 text-blue"><CircleDollarSign size={12} className="mr-1" />{formatMoney(task.amount)}</Badge>}
      </div>
      {task.checklistTotal > 0 && <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-zinc-500"><span className="flex items-center gap-1"><ListChecks size={11} />Checklist</span><span>{task.checklistCompleted}/{task.checklistTotal}</span></div><div className="h-1 bg-zinc-100"><div className="h-full bg-blue" style={{ width: `${(task.checklistCompleted / task.checklistTotal) * 100}%` }} /></div></div>}
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
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas"><Check className="text-zinc-400" size={24} /></span><h3 className="mt-4 font-semibold tracking-tight">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>{action && <button className="button-primary mt-5" onClick={onAction}>{action}</button>}</div>
}

export function Table({ columns, data, emptyMessage = 'No records found.' }) {
  if (!data.length) return <div className="p-10 text-center text-sm text-zinc-500">{emptyMessage}</div>
  return (
    <div className="overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[900px] border-collapse text-left"><thead className="sticky top-0 z-[1]"><tr className="border-b border-line bg-canvas/95 backdrop-blur">{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{column.label}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={row.id || index} className="border-b border-line transition-colors last:border-0 hover:bg-blue/[0.025]">{columns.map((column) => <td key={column.key} className="px-5 py-4 text-sm align-middle">{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>
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
