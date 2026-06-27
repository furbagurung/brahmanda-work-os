import { BellRing, CalendarDays, Pencil, UserRound } from 'lucide-react'

import { EmptyState, PageHeader, PriorityBadge, StatCard, StatusBadge } from './components'
import { formatDate, todayDateString } from './utils'

export default function RemindersPage({ clients, tasks, onEditTask }) {
  const today = todayDateString()
  const reminders = tasks
    .filter((task) => task.reminderDate && task.reminderDate >= today && task.status !== 'Completed')
    .sort((a, b) => a.reminderDate.localeCompare(b.reminderDate) || a.title.localeCompare(b.title))
  const grouped = reminders.reduce((groups, task) => {
    groups[task.reminderDate] = [...(groups[task.reminderDate] || []), task]
    return groups
  }, {})

  return <>
    <PageHeader number="06" title="Reminders" description="Upcoming task reminders grouped by date." />

    <div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard icon={BellRing} value={reminders.length} label="Upcoming reminders" /><StatCard icon={CalendarDays} value={reminders.filter((task) => task.reminderDate === today).length} label="Scheduled today" /><StatCard icon={CalendarDays} value={Object.keys(grouped).length} label="Reminder dates" /></div>

    {reminders.length ? <div className="space-y-4">{Object.entries(grouped).map(([date, dateTasks]) => <section className="panel" key={date}>
      <header className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3"><h2 className="text-sm font-semibold">{formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2><span className="text-xs text-zinc-500">{dateTasks.length} reminder{dateTasks.length === 1 ? '' : 's'}</span></header>
      <div className="divide-y divide-line">{dateTasks.map((task) => <article className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.6fr)_auto]" key={task.id}>
        <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-sm text-zinc-500">{clients.find((client) => client.id === task.clientId)?.name || 'Deleted client'}</p><p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><UserRound size={12} />{task.assignedUserName || 'Unassigned'}</p>{task.reminderNote && <p className="mt-3 text-sm leading-6 text-zinc-600">{task.reminderNote}</p>}</div>
        <div className="flex flex-wrap items-start gap-2"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></div>
        <button className="button-secondary self-start px-3 py-2" onClick={() => onEditTask(task)}><Pencil size={14} />Edit task</button>
      </article>)}</div>
    </section>)}</div> : <EmptyState title="No upcoming reminders" description="Add a reminder date to an open task and it will appear here." />}
  </>
}
