import { BellRing, CalendarDays, Pencil } from 'lucide-react'

import { EmptyState, PriorityBadge, StatusBadge } from './components'
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
    <div className="mb-8 flex items-start gap-4 border-b border-line pb-7 sm:gap-5">
      <span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">06</span>
      <div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Reminders</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Upcoming task reminders grouped by date.</p></div>
    </div>

    <div className="mb-5 grid gap-px border border-line bg-line sm:grid-cols-3">
      <div className="bg-white p-5"><BellRing size={17} className="text-blue" /><p className="mt-5 text-3xl font-semibold">{reminders.length}</p><p className="mt-1 text-sm text-zinc-500">Upcoming reminders</p></div>
      <div className="bg-white p-5"><CalendarDays size={17} className="text-orange-700" /><p className="mt-5 text-3xl font-semibold">{reminders.filter((task) => task.reminderDate === today).length}</p><p className="mt-1 text-sm text-zinc-500">Scheduled today</p></div>
      <div className="bg-white p-5"><CalendarDays size={17} className="text-blue" /><p className="mt-5 text-3xl font-semibold">{Object.keys(grouped).length}</p><p className="mt-1 text-sm text-zinc-500">Reminder dates</p></div>
    </div>

    {reminders.length ? <div className="space-y-5">{Object.entries(grouped).map(([date, dateTasks]) => <section className="panel" key={date}>
      <header className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3"><h2 className="text-sm font-semibold">{formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2><span className="text-xs text-zinc-500">{dateTasks.length} reminder{dateTasks.length === 1 ? '' : 's'}</span></header>
      <div className="divide-y divide-line">{dateTasks.map((task) => <article className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.6fr)_auto]" key={task.id}>
        <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-sm text-zinc-500">{clients.find((client) => client.id === task.clientId)?.name || 'Deleted client'}</p>{task.reminderNote && <p className="mt-3 text-sm leading-6 text-zinc-600">{task.reminderNote}</p>}</div>
        <div className="flex flex-wrap items-start gap-2"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></div>
        <button className="button-secondary self-start px-3 py-2" onClick={() => onEditTask(task)}><Pencil size={14} />Edit task</button>
      </article>)}</div>
    </section>)}</div> : <EmptyState title="No upcoming reminders" description="Add a reminder date to an open task and it will appear here." />}
  </>
}
