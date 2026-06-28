import { forwardRef, useEffect, useRef, useState } from 'react'
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

const buttonStyles = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-ink',
  danger: 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50',
}

const badgeVariants = {
  neutral: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  info: 'border-blue/15 bg-blue/5 text-blue',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
}

export function Card({ children, className = '', interactive = false }) {
  return <section className={`panel ${interactive ? 'transition duration-150 hover:border-zinc-300 hover:bg-zinc-50/30' : ''} ${className}`}>{children}</section>
}

export const Button = forwardRef(function Button({ children, variant = 'primary', className = '', type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={`${buttonStyles[variant] || buttonStyles.primary} ${className}`} {...props}>{children}</button>
})

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`field ${className}`} {...props} />
})

export const Select = forwardRef(function Select({ children, className = '', ...props }, ref) {
  return <select ref={ref} className={`field ${className}`} {...props}>{children}</select>
})

export function PageHeader({ number, eyebrow, title, description, actions, action, onAction }) {
  const headerAction = actions || (typeof action === 'string' ? <Button onClick={onAction}>{action}</Button> : action)
  return <header className="mb-7 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="flex items-start gap-3">
      {number && <span className="select-none pt-1 text-xs font-semibold text-zinc-400 tabular-nums">{number}</span>}
      <div>{eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink md:text-[1.75rem]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}</div>
    </div>
    {headerAction}
  </header>
}

export function SectionHeader({ title, description, action, className = '' }) {
  return <header className={`section-header ${className}`}><div><h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>}</div>{action}</header>
}

export function TableWrapper({ children, className = '' }) {
  return <div className={`overflow-hidden rounded-xl border border-zinc-200 bg-white ${className}`}>{children}</div>
}

export function Skeleton({ className = '' }) {
  return <span className={`block animate-pulse rounded-lg bg-zinc-200/80 ${className}`} aria-hidden="true" />
}

export function StatCard({ label, value, change, trend = 'up', icon: Icon }) {
  return (
    <div className="panel group p-4 transition duration-150 hover:border-zinc-300">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue/15 bg-blue/5 text-blue"><Icon size={18} strokeWidth={1.8} /></div>
        {change && <span className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-700' : 'text-zinc-500'}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span>}
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}

export function Badge({ children, className = '', variant = 'neutral' }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-4 ${badgeVariants[variant] || ''} ${className}`}>{children}</span>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/35 p-0 backdrop-blur-[1px] sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`max-h-[96dvh] w-full overflow-y-auto rounded-t-xl border border-zinc-200 bg-white shadow-xl sm:max-h-[92vh] sm:rounded-xl ${size}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white/95 p-5 backdrop-blur sm:p-6">
          <div><h2 id="modal-title" className="text-xl font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}</div>
          <button ref={closeButtonRef} className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-zinc-500 hover:bg-canvas hover:text-ink" onClick={onClose} aria-label="Close modal"><X size={17} /></button>
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
  const assigneeInitials = task.assignedUserName
    ? task.assignedUserName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : ''
  return (
    <Card interactive className="p-4">
      <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-1.5"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></div><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>
      <h3 className="mt-3 text-sm font-semibold leading-snug tracking-tight">{task.title}</h3>
      {!compact && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between gap-3"><p className="truncate text-xs font-medium text-zinc-500">{client?.name || 'Deleted client'}</p><span className="flex items-center gap-1.5 text-xs text-zinc-500">{assigneeInitials ? <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 text-[9px] font-bold text-white">{assigneeInitials}</span> : <UserRound size={13} />}{task.assignedUserName || 'Unassigned'}</span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700"><CalendarDays size={12} className="mr-1" />{formatDate(task.deadline)}</Badge>
        <DeadlineBadge task={task} />
        <RecurringBadge task={task} />
        {task.billable && <Badge className="border-blue/20 bg-blue/5 text-blue"><CircleDollarSign size={12} className="mr-1" />{formatMoney(task.amount)}</Badge>}
      </div>
      {task.checklistTotal > 0 && <div className="mt-3 rounded-xl bg-canvas p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-medium text-zinc-500"><span className="flex items-center gap-1"><ListChecks size={11} />Checklist</span><span>{task.checklistCompleted}/{task.checklistTotal}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-blue" style={{ width: `${(task.checklistCompleted / task.checklistTotal) * 100}%` }} /></div></div>}
      <div className="mt-4 border-t border-line pt-3">
        <select className="w-full rounded-lg bg-canvas px-2 py-2 text-xs font-semibold outline-none transition hover:bg-zinc-100" value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value)} aria-label="Change task status">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
      </div>
    </Card>
  )
}

export function ClientCard({ client, metrics, onView, onEdit, onDelete }) {
  const completion = metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0
  const active = String(client.status || 'active').toLowerCase() === 'active'
  return (
    <Card interactive className="group p-4">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: client.color }}>{client.initials}</div><div className="min-w-0"><button className="block max-w-full truncate text-left text-base font-semibold tracking-tight group-hover:text-blue" onClick={onView}>{client.name}</button><p className="mt-0.5 truncate text-xs text-zinc-500">{client.contact || 'No contact person'}</p></div></div><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>
      <div className="mt-4 flex items-center justify-between border-y border-line py-3"><Badge variant={active ? 'success' : 'warning'}>{active ? 'Active' : String(client.status || '').replaceAll('_', ' ')}</Badge><span className="text-xs font-semibold tabular-nums text-zinc-500">{completion}% delivered</span></div>
      <div className="grid grid-cols-3 divide-x divide-line py-4"><div><div className="text-lg font-semibold tabular-nums">{metrics.total}</div><div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Tasks</div></div><div className="pl-3"><div className="text-lg font-semibold tabular-nums">{metrics.pending}</div><div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Pending</div></div><div className="min-w-0 pl-3"><div className="truncate text-sm font-semibold tabular-nums">{formatMoney(metrics.billable)}</div><div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Billable</div></div></div>
      <div className="h-1 overflow-hidden bg-zinc-100"><div className="h-full bg-blue transition-all" style={{ width: `${completion}%` }} /></div>
      <button onClick={onView} className="mt-4 flex w-full items-center justify-between text-xs font-semibold text-zinc-600 hover:text-blue">Open workspace <ChevronRight size={15} /></button>
    </Card>
  )
}

export function EmptyState({ title, description, action, onAction }) {
  return <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100"><Check className="text-zinc-400" size={18} /></span><h3 className="mt-3 text-sm font-semibold tracking-tight">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>{action && <button className="button-primary mt-4" onClick={onAction}>{action}</button>}</div>
}

export function Table({ columns, data, emptyMessage = 'No records found.' }) {
  if (!data.length) return <div className="p-10 text-center text-sm text-zinc-500">{emptyMessage}</div>
  return (
    <div className="overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[900px] border-separate border-spacing-0 text-left"><thead className="sticky top-0 z-[1]"><tr className="bg-zinc-50/95 backdrop-blur">{columns.map((column) => <th key={column.key} className="border-b border-line px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 first:pl-5 last:pr-5">{column.label}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={row.id || index} className="group transition-colors hover:bg-zinc-50/80">{columns.map((column) => <td key={column.key} className="border-b border-line px-4 py-3.5 text-sm align-middle group-last:border-0 first:pl-5 last:pr-5">{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>
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
