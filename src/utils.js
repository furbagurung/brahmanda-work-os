export function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString()}`
}

export function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
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
