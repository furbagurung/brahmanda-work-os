import { useEffect, useRef, useState } from 'react'
import {
  CalendarCheck, CircleDollarSign, Plus, UserPlus, X,
} from 'lucide-react'

import { CATEGORIES, PRIORITIES, TASK_STATUSES } from './data'
import { todayDateString } from './utils'

export function QuickAddMenu({ open, onClose, onAddTask, onAddClient, onAddDailyLog, onAddBilling }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => !ref.current?.contains(event.target) && onClose()
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, onClose])
  if (!open) return null
  const options = [
    ['Add Task', 'Create a task with essential fields', Plus, onAddTask],
    ['Add Client', 'Create a new client workspace', UserPlus, onAddClient],
    ['Add Daily Log', 'Create completed work and its daily log', CalendarCheck, onAddDailyLog],
    ['Add Billing Item', 'Create an extra billable task', CircleDollarSign, onAddBilling],
  ]
  return <div ref={ref} className="absolute right-0 top-12 z-40 w-[min(20rem,calc(100vw-1.5rem))] border border-line bg-white shadow-xl">{options.map(([title, description, Icon, action]) => <button key={title} className="flex w-full items-start gap-3 border-b border-line p-4 text-left last:border-0 hover:bg-canvas" onClick={() => { action(); onClose() }}><span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-blue"><Icon size={16} /></span><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span></span></button>)}</div>
}

export function QuickTaskForm({ clients, defaults = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    id: '',
    clientId: defaults.clientId || clients[0]?.id || '',
    title: '',
    description: '',
    category: defaults.category || 'Design',
    priority: defaults.priority || 'Medium',
    deadline: defaults.deadline ?? todayDateString(),
    reminderDate: '',
    reminderNote: '',
    status: defaults.status || 'New',
    billable: Boolean(defaults.billable),
    amount: defaults.amount || 0,
    proofLink: '',
    attachments: [],
    assignee: 'AS',
    completedAt: '',
    paymentStatus: 'Unpaid',
    invoiceStatus: 'Not invoiced',
  })
  const [saving, setSaving] = useState(false)
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    const attachments = form.proofLink.trim()
      ? [{ id: '', type: 'link', title: 'Proof link', url: form.proofLink.trim() }]
      : []
    setSaving(true)
    await onSave({ ...form, attachments })
    setSaving(false)
    onClose()
  }
  const fieldLabel = 'mb-2 block text-sm font-semibold'
  return <form onSubmit={submit}>
    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
      <label><span className={fieldLabel}>Client</span><select className="field" value={form.clientId} onChange={(event) => change('clientId', event.target.value)} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
      <label><span className={fieldLabel}>Task title</span><input className="field" value={form.title} onChange={(event) => change('title', event.target.value)} required autoFocus /></label>
      <label><span className={fieldLabel}>Category</span><select className="field" value={form.category} onChange={(event) => change('category', event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label><span className={fieldLabel}>Priority</span><select className="field" value={form.priority} onChange={(event) => change('priority', event.target.value)}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
      <label><span className={fieldLabel}>Deadline</span><input className="field" type="date" value={form.deadline} onChange={(event) => change('deadline', event.target.value)} /></label>
      <label><span className={fieldLabel}>Reminder date</span><input className="field" type="date" value={form.reminderDate} onChange={(event) => change('reminderDate', event.target.value)} /></label>
      <label><span className={fieldLabel}>Status</span><select className="field" value={form.status} onChange={(event) => change('status', event.target.value)}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label><span className={fieldLabel}>Proof link</span><input className="field" type="url" value={form.proofLink} onChange={(event) => change('proofLink', event.target.value)} placeholder="https://" /></label>
      <label className="flex items-center gap-3 border border-line p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.billable} onChange={(event) => change('billable', event.target.checked)} className="h-4 w-4 accent-blue" />Billable work</label>
      {form.billable && <label><span className={fieldLabel}>Billable amount</span><input className="field" type="number" min="0" value={form.amount} onChange={(event) => change('amount', event.target.value)} required /></label>}
    </div>
    <div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button type="button" className="button-secondary" onClick={onClose}><X size={15} />Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Add task'}</button></div>
  </form>
}
