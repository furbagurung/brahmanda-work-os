import { forwardRef, useEffect, useRef, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign,
  ExternalLink, Globe2, Image, ListChecks, Monitor, MoreHorizontal, Pencil, ReceiptText, Repeat2,
  Search, Sparkles, Trash2, UserRound, Video, X,
} from 'lucide-react'

import { deadlineState, formatDate, formatMoney } from './utils'

const statusStyle = {
  New: 'border-zinc-300 bg-zinc-50 text-zinc-700',
  'In Progress': 'border-blue/20 bg-blue/5 text-blue',
  'Waiting for Client': 'border-amber-200 bg-amber-50 text-amber-800',
  Revision: 'border-orange-200 bg-orange-50 text-orange-700',
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

export const getStatusTone = (status) => statusStyle[status] || statusStyle.New
export const getStatusLabel = (status) =>
  status === 'New' ? 'Not Started' : status
export const getPriorityTone = (priority) => priorityStyle[priority] || priorityStyle.Low
export const getStatusDotTone = (status) => ({
  New: 'bg-slate-400',
  'In Progress': 'bg-blue',
  'Waiting for Client': 'bg-amber-500',
  Revision: 'bg-orange-500',
  Completed: 'bg-emerald-600',
}[status] || 'bg-slate-400')

export const CATEGORY_COMBOBOX_OPTIONS = [
  { value: 'Reels', label: 'Reels', icon: Video, tone: 'bg-rose-50 text-rose-600' },
  { value: 'Print Design', label: 'Print Design', icon: Image, tone: 'bg-violet-50 text-violet-600' },
  { value: 'Creative', label: 'Creative', icon: Sparkles, tone: 'bg-amber-50 text-amber-700' },
  { value: 'Web', label: 'Web', icon: Globe2, tone: 'bg-blue/5 text-blue' },
  { value: 'Reporting', label: 'Reporting', icon: BarChart3, tone: 'bg-emerald-50 text-emerald-700' },
  { value: 'Digital', label: 'Digital', icon: Monitor, tone: 'bg-slate-100 text-slate-600' },
]

export const TASK_STATUS_COMBOBOX_OPTIONS = [
  { value: 'New', label: getStatusLabel('New'), dotClass: 'bg-slate-400' },
  { value: 'In Progress', label: 'In Progress', dotClass: 'bg-blue' },
  { value: 'Waiting for Client', label: 'Waiting for Client', dotClass: 'bg-amber-500' },
  { value: 'Revision', label: 'Revision', dotClass: 'bg-orange-500' },
  { value: 'Completed', label: 'Completed', dotClass: 'bg-emerald-600' },
]

export const CLIENT_STATUS_COMBOBOX_OPTIONS = [
  { value: 'active', label: 'Active', dotClass: 'bg-emerald-600' },
  { value: 'inactive', label: 'Inactive', dotClass: 'bg-slate-400' },
  { value: 'on_hold', label: 'On hold', dotClass: 'bg-amber-500' },
]

export function getDeadlineTone(state) {
  const styles = {
    Overdue: 'border-red-200 bg-red-50 text-red-700',
    'Due Today': 'border-amber-200 bg-amber-50 text-amber-800',
    'Due Tomorrow': 'border-amber-200 bg-amber-50 text-amber-800',
    'Due This Week': 'border-blue/20 bg-blue/5 text-blue',
    Upcoming: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  }
  return styles[state] || ''
}

export function getBillingTone(value) {
  if (!value || value === 'Billable' || value === 'Extra billable') return 'border-blue/20 bg-blue/5 text-blue'
  if (value === 'Paid' || value === 'Sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (value === 'Overdue') return 'border-red-200 bg-red-50 text-red-700'
  if (['Pending', 'Unpaid', 'Draft', 'Pending Review', 'Partial'].includes(value)) return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-zinc-200 bg-zinc-50 text-zinc-700'
}

export function StatusBadge({ status }) {
  return <Badge className={getStatusTone(status)}>{getStatusLabel(status)}</Badge>
}

export function PriorityBadge({ priority }) {
  return <Badge className={getPriorityTone(priority)}>{priority}</Badge>
}

export function DeadlineBadge({ task }) {
  const state = deadlineState(task)
  const tone = getDeadlineTone(state)
  if (!tone) return null
  return <Badge className={tone}>{state}</Badge>
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
        <select className="w-full rounded-lg bg-canvas px-2 py-2 text-xs font-semibold outline-none transition hover:bg-zinc-100" value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value)} aria-label="Change task status">{statuses.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}</select>
      </div>
    </Card>
  )
}

function ModernSelectLeading({ option }) {
  if (!option) return null
  if (option.dotClass) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">
        <span className={`h-2.5 w-2.5 rounded-full ${option.dotClass}`} />
      </span>
    )
  }
  if (option.initials) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10px] font-bold text-blue">
        {option.initials}
      </span>
    )
  }
  if (option.icon) {
    const Icon = option.icon
    return (
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${option.tone || 'bg-zinc-100 text-zinc-500'}`}>
        <Icon size={14} />
      </span>
    )
  }
  return null
}

export function ModernSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const selectedOption =
    options.find((option) => String(option.value) === String(value)) ||
    (value ? { value, label: String(value) } : null)
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.description || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus())
  }, [open, searchable])

  const choose = (option) => {
    onChange(option.value)
    setOpen(false)
  }

  const handleKeys = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (!filteredOptions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % filteredOptions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + filteredOptions.length) % filteredOptions.length)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      choose(filteredOptions[activeIndex])
    }
  }

  const validationOptions = selectedOption &&
    !options.some((option) => String(option.value) === String(value))
    ? [selectedOption, ...options]
    : options

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <select
        className="pointer-events-none absolute h-px w-px opacity-0"
        value={value}
        onChange={() => {}}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="">{placeholder}</option>
        {validationOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        type="button"
        className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-white px-2.5 text-left text-sm shadow-soft outline-none transition ${
          open
            ? 'border-blue/40 ring-2 ring-blue/10'
            : 'border-zinc-200 hover:border-zinc-300'
        } disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (!open && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
            event.preventDefault()
            setOpen(true)
            return
          }
          handleKeys(event)
        }}
      >
        <ModernSelectLeading option={selectedOption} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${selectedOption ? 'text-zinc-800' : 'text-zinc-400'}`}>
            {selectedOption?.label || placeholder}
          </span>
          {selectedOption?.description && (
            <span className="mt-0.5 block truncate text-[10px] capitalize text-zinc-400">
              {selectedOption.description}
            </span>
          )}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-panel">
          {searchable && (
            <div className="border-b border-zinc-100 p-2.5">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 focus-within:ring-2 focus-within:ring-blue/10">
                <Search size={14} className="shrink-0 text-zinc-400" />
                <input
                  ref={searchRef}
                  className="client-combobox-search min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-zinc-400"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActiveIndex(0)
                  }}
                  onKeyDown={handleKeys}
                  placeholder={searchPlaceholder}
                />
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox">
            {filteredOptions.map((option, index) => {
              const selected = String(option.value) === String(value)
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                    selected || index === activeIndex ? 'bg-blue/5' : 'hover:bg-zinc-50'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                >
                  <ModernSelectLeading option={option} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-800">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-[11px] capitalize text-zinc-400">{option.description}</span>
                    )}
                  </span>
                  {selected && <Check size={15} className="shrink-0 text-blue" />}
                </button>
              )
            })}
            {!filteredOptions.length && (
              <p className="px-3 py-6 text-center text-xs text-zinc-400">No options found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function getClientInitials(name, fallback = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
  return String(fallback || '?').trim().slice(0, 2).toUpperCase()
}

export function ClientIdentity({ client, className = '', imageClassName = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const logoUrl = client?.logoUrl || client?.logo_url || ''

  useEffect(() => setImageFailed(false), [logoUrl])

  return (
    <span className={`flex items-center justify-center overflow-hidden bg-white font-bold text-blue ${className}`}>
      {logoUrl && !imageFailed ? (
        <img
          className={`h-full w-full bg-white object-cover object-center ${imageClassName}`}
          src={logoUrl}
          alt={`${client?.name || 'Client'} logo`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-blue/10 text-current">
          {getClientInitials(client?.name, client?.initials)}
        </span>
      )}
    </span>
  )
}

export function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = 'Select client',
  className = '',
  required = true,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const selectedClient = clients.find((client) => String(client.id) === String(value))
  const filteredClients = clients.filter((client) =>
    String(client.name || '').toLowerCase().includes(search.trim().toLowerCase()),
  )

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => !rootRef.current?.contains(event.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    setSearch('')
    setActiveIndex(0)
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  const selectClient = (client) => {
    onChange(String(client.id))
    setOpen(false)
  }

  const handleListNavigation = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (!filteredClients.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % filteredClients.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + filteredClients.length) % filteredClients.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectClient(filteredClients[activeIndex])
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <select
        className="pointer-events-none absolute h-px w-px opacity-0"
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="">Select client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </select>
      <button
        type="button"
        className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-white px-3 text-left text-sm shadow-soft outline-none transition ${open ? 'border-blue/40 ring-2 ring-blue/10' : 'border-zinc-200 hover:border-zinc-300'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (!open && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {selectedClient ? (
          <ClientIdentity client={selectedClient} className="h-7 w-7 shrink-0 rounded-lg text-[10px]" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
            <UserRound size={13} />
          </span>
        )}
        <span className={`min-w-0 flex-1 truncate font-medium ${selectedClient ? 'text-zinc-800' : 'text-zinc-400'}`}>
          {selectedClient?.name || placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-panel">
          <div className="border-b border-zinc-100 p-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue/10">
              <Search size={14} className="shrink-0 text-zinc-400" />
              <input
                ref={searchRef}
                className="client-combobox-search min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-zinc-400"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleListNavigation}
                placeholder="Search clients..."
                aria-label="Search clients"
                role="combobox"
                aria-expanded="true"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox">
            {filteredClients.map((client, index) => {
              const selected = String(client.id) === String(value)
              const detail =
                client.servicePackage ||
                client.service_package ||
                String(client.status || '').replaceAll('_', ' ')
              return (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${selected || index === activeIndex ? 'bg-blue/5' : 'hover:bg-zinc-50'}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectClient(client)}
                >
                  <ClientIdentity client={client} className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 text-[10px] shadow-soft" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-800">{client.name}</span>
                    {detail && <span className="mt-0.5 block truncate text-[11px] capitalize text-zinc-400">{detail}</span>}
                  </span>
                  {selected && <Check size={15} className="shrink-0 text-blue" />}
                </button>
              )
            })}
            {!filteredClients.length && (
              <p className="px-3 py-6 text-center text-xs text-zinc-400">No clients found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ClientCard({ client, metrics, onView, onEdit, onDelete }) {
  const completion = metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0
  const active = String(client.status || 'active').toLowerCase() === 'active'
  return (
    <Card interactive className="group min-h-[260px] p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><ClientIdentity client={client} className="h-11 w-11 shrink-0 rounded-xl text-sm shadow-soft" /><div className="min-w-0"><button className="block max-w-full truncate text-left text-base font-bold tracking-tight group-hover:text-blue" onClick={onView}>{client.name}</button><p className="mt-1 truncate text-xs text-zinc-500">{client.contact || 'No contact person'}</p></div></div><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>
      <div className="mt-5 flex items-center justify-between"><Badge variant={active ? 'success' : 'warning'}>{active ? 'Active' : String(client.status || '').replaceAll('_', ' ')}</Badge><span className="text-xs font-semibold tabular-nums text-zinc-500">{completion}% delivered</span></div>
      <div className="mt-4 grid grid-cols-3 rounded-xl border border-line bg-canvas/70 p-3"><div><div className="text-xl font-semibold tabular-nums">{metrics.total}</div><div className="text-[10px] font-medium text-zinc-400">Tasks</div></div><div><div className="text-xl font-semibold tabular-nums">{metrics.pending}</div><div className="text-[10px] font-medium text-zinc-400">Pending</div></div><div className="min-w-0"><div className="truncate text-sm font-semibold tabular-nums">{formatMoney(metrics.billable)}</div><div className="text-[10px] font-medium text-zinc-400">Extras</div></div></div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-blue transition-all" style={{ width: `${completion}%` }} /></div>
      <button onClick={onView} className="mt-5 flex w-full items-center justify-between border-t border-line pt-4 text-xs font-semibold text-zinc-600 hover:text-blue">Open workspace <ChevronRight size={15} /></button>
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
  return <Badge className={getBillingTone(value)}>{type === 'invoice' && <ReceiptText size={12} className="mr-1" />}{value || 'Extra billable'}</Badge>
}

export function ProofLink({ href }) {
  if (!href) return <span className="text-zinc-400">Not added</span>
  return <a className="inline-flex items-center gap-1 font-medium text-blue hover:underline" href={href} target="_blank" rel="noreferrer">Open proof <ExternalLink size={13} /></a>
}
