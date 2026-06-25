import { useMemo, useState } from 'react'
import {
  BellRing, CalendarDays, ChevronLeft, ChevronRight, Pencil, X,
} from 'lucide-react'

import { Badge, DeadlineBadge, PriorityBadge, StatusBadge } from './components'
import { PRIORITIES, TASK_STATUSES } from './data'
import { formatDate, todayDateString } from './utils'
import { calendarDays } from './calendarUtils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function EventMarker({ event, client, onClick }) {
  const isReminder = event.type === 'reminder'
  return <button className={`block w-full border-l-2 px-2 py-1.5 text-left transition ${isReminder ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' : 'border-blue bg-blue/5 hover:bg-blue/10'}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); onClick() }}>
    <span className="block truncate text-[11px] font-semibold">{event.task.title}</span>
    <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{client?.name || 'Deleted client'}</span>
    <span className="mt-1.5 flex flex-wrap gap-1"><PriorityBadge priority={event.task.priority} />{isReminder ? <Badge className="border-orange-200 bg-orange-50 text-orange-800"><BellRing size={11} className="mr-1" />Reminder</Badge> : <><Badge className="border-blue/20 bg-blue/5 text-blue"><CalendarDays size={11} className="mr-1" />Deadline</Badge><DeadlineBadge task={event.task} /></>}</span>
  </button>
}

function DatePanel({ date, events, clients, onClose, onEditTask, updateTask }) {
  if (!date) return null
  const taskIds = [...new Set(events.map((event) => event.task.id))]
  return <div className="fixed inset-0 z-50 bg-black/30" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-line bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white p-5 sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-wider text-blue">Calendar date</p><h2 className="mt-2 text-xl font-semibold">{formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2><p className="mt-1 text-sm text-zinc-500">{taskIds.length} task{taskIds.length === 1 ? '' : 's'}, {events.length} calendar item{events.length === 1 ? '' : 's'}</p></div>
        <button className="flex h-9 w-9 items-center justify-center border border-line hover:bg-canvas" onClick={onClose} aria-label="Close date panel"><X size={17} /></button>
      </header>
      <div className="divide-y divide-line">
        {events.length ? events.map((event) => {
          const client = clients.find((item) => item.id === event.task.clientId)
          return <article className="p-5 sm:p-6" key={`${event.type}-${event.task.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold ${event.type === 'reminder' ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-blue/20 bg-blue/5 text-blue'}`}>{event.type === 'reminder' ? <BellRing size={12} /> : <CalendarDays size={12} />}{event.type === 'reminder' ? 'Reminder' : 'Deadline'}</span><PriorityBadge priority={event.task.priority} /></div><h3 className="mt-3 font-semibold">{event.task.title}</h3><p className="mt-1 text-sm text-zinc-500">{client?.name || 'Deleted client'}</p></div>
              <button className="button-secondary shrink-0 px-3 py-2" onClick={() => onEditTask(event.task)}><Pencil size={14} />Edit</button>
            </div>
            {event.type === 'reminder' && event.task.reminderNote && <p className="mt-4 border-l-2 border-orange-400 pl-3 text-sm leading-6 text-zinc-600">{event.task.reminderNote}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <DeadlineBadge task={event.task} />
              <StatusBadge status={event.task.status} />
              <select className="border border-line bg-white px-2 py-1.5 text-xs font-semibold" value={event.task.status} onChange={(changeEvent) => updateTask(event.task.id, { status: changeEvent.target.value })} aria-label={`Update status for ${event.task.title}`}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
            </div>
          </article>
        }) : <p className="p-8 text-sm text-zinc-500">No deadlines or reminders on this date.</p>}
      </div>
    </aside>
  </div>
}

export default function CalendarPage({ clients, tasks, onEditTask, updateTask }) {
  const today = todayDateString()
  const todayParts = today.split('-').map(Number)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(Date.UTC(todayParts[0], todayParts[1] - 1, 1)))
  const [clientFilter, setClientFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedDate, setSelectedDate] = useState(null)

  const filteredTasks = tasks.filter((task) => (
    (clientFilter === 'All' || task.clientId === clientFilter)
    && (priorityFilter === 'All' || task.priority === priorityFilter)
    && (statusFilter === 'All' || task.status === statusFilter)
  ))

  const eventsByDate = useMemo(() => {
    const events = {}
    const add = (date, event) => {
      if (!date) return
      events[date] = [...(events[date] || []), event]
    }
    filteredTasks.forEach((task) => {
      if (typeFilter !== 'Reminders only') add(task.deadline, { type: 'deadline', task })
      if (typeFilter !== 'Deadlines only') add(task.reminderDate, { type: 'reminder', task })
    })
    return events
  }, [filteredTasks, typeFilter])

  const year = visibleMonth.getUTCFullYear()
  const month = visibleMonth.getUTCMonth()
  const days = calendarDays(year, month)
  const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(visibleMonth)
  const moveMonth = (amount) => setVisibleMonth(new Date(Date.UTC(year, month + amount, 1)))
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : []

  return <>
    <div className="mb-7 flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-4 sm:gap-5"><span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">07</span><div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Calendar</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Task deadlines and reminders across all client work.</p></div></div>
      <div className="flex items-center self-start border border-line bg-white"><button className="flex h-10 w-10 items-center justify-center border-r border-line hover:bg-canvas" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><h2 className="min-w-48 px-4 text-center text-sm font-semibold">{title}</h2><button className="flex h-10 w-10 items-center justify-center border-l border-line hover:bg-canvas" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button></div>
    </div>

    <div className="mb-5 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
      <select className="field" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option>All</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      <select className="field" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select>
      <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
      <select className="field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All</option><option>Deadlines only</option><option>Reminders only</option></select>
    </div>

    <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-zinc-600"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 bg-blue" />Deadline</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 bg-orange-500" />Reminder</span><button className="font-semibold text-blue hover:underline" onClick={() => setVisibleMonth(new Date(Date.UTC(todayParts[0], todayParts[1] - 1, 1)))}>Go to today</button></div>

    <section className="overflow-x-auto border border-line bg-line">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-7 gap-px bg-line">{WEEKDAYS.map((weekday) => <div className="bg-canvas px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500" key={weekday}>{weekday}</div>)}</div>
        <div className="grid grid-cols-7 gap-px bg-line">{days.map((day) => {
          const events = eventsByDate[day.key] || []
          const visibleEvents = events.slice(0, 3)
          return <div className={`min-h-40 cursor-pointer bg-white p-2.5 text-left align-top transition hover:bg-zinc-50 ${day.currentMonth ? '' : 'text-zinc-300'} ${day.key === today ? 'ring-2 ring-inset ring-blue' : ''}`} key={day.key} onClick={() => setSelectedDate(day.key)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedDate(day.key) }} role="button" tabIndex={0} aria-label={`Open ${formatDate(day.key, { year: 'numeric', month: 'long', day: 'numeric' })}`}>
            <span className={`flex h-7 w-7 items-center justify-center text-xs font-semibold ${day.key === today ? 'bg-blue text-white' : ''}`}>{day.date.getUTCDate()}</span>
            <span className="mt-2 block space-y-1.5">{visibleEvents.map((event) => <EventMarker key={`${event.type}-${event.task.id}`} event={event} client={clients.find((client) => client.id === event.task.clientId)} onClick={() => setSelectedDate(day.key)} />)}{events.length > visibleEvents.length && <span className="block px-2 text-[10px] font-semibold text-zinc-500">+{events.length - visibleEvents.length} more</span>}</span>
          </div>
        })}</div>
      </div>
    </section>

    <DatePanel date={selectedDate} events={selectedEvents} clients={clients} onClose={() => setSelectedDate(null)} onEditTask={onEditTask} updateTask={updateTask} />
  </>
}
