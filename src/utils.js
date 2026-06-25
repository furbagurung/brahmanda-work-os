let workspaceCurrency = 'NPR'
let workspaceDateFormat = 'MMM d, yyyy'

export function setWorkspaceCurrency(currency) {
  workspaceCurrency = currency || 'NPR'
}

export function setWorkspaceDateFormat(dateFormat) {
  workspaceDateFormat = dateFormat || 'MMM d, yyyy'
}

export function formatMoney(value, currency = workspaceCurrency) {
  const amount = Number(value || 0)
  if (currency === 'NPR') return `Rs ${amount.toLocaleString()}`
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export function formatDate(value, options = null) {
  if (!value) return 'No date'
  const defaults = workspaceDateFormat === 'dd/MM/yyyy'
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : workspaceDateFormat === 'yyyy-MM-dd'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  const locale = workspaceDateFormat === 'yyyy-MM-dd' ? 'en-CA' : workspaceDateFormat === 'dd/MM/yyyy' ? 'en-GB' : 'en-US'
  return new Intl.DateTimeFormat(locale, { ...(options || defaults), timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function todayDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function daysFromToday(value, today = todayDateString()) {
  if (!value) return null
  const day = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / day)
}

export function deadlineState(task, today = todayDateString()) {
  if (!task.deadline) return 'No Deadline'
  if (task.status === 'Completed') return 'Completed'
  const days = daysFromToday(task.deadline, today)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due Today'
  if (days === 1) return 'Due Tomorrow'
  if (days <= 7) return 'Due This Week'
  return 'Upcoming'
}
