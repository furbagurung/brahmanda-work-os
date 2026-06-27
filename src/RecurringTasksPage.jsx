import { CalendarClock, Play, Repeat2 } from 'lucide-react'

import { Badge, Button, EmptyState, PageHeader, PriorityBadge, StatCard, StatusBadge } from './components'
import { recurrenceLabel } from './recurrenceUtils'
import { formatDate, todayDateString } from './utils'

export default function RecurringTasksPage({
  clients,
  tasks,
  onEditTask,
  updateTask,
  onGenerate,
  generating,
  generationMessage,
}) {
  const today = todayDateString()
  const recurring = tasks
    .filter((task) => task.recurrenceType && !task.recurringParentId)
    .sort((a, b) => (a.nextOccurrenceDate || '9999').localeCompare(b.nextOccurrenceDate || '9999'))
  const active = recurring.filter((task) => task.isRecurring)
  const due = active.filter((task) => task.nextOccurrenceDate && task.nextOccurrenceDate <= today)

  return <>
    <PageHeader number="08" title="Recurring Tasks" description="Manage repeating client work and generate task occurrences that are due." actions={<Button onClick={onGenerate} disabled={generating}><Play size={15} />{generating ? 'Generating…' : 'Generate Due Recurring Tasks'}</Button>} />

    <div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard icon={Repeat2} value={active.length} label="Active recurring tasks" /><StatCard icon={CalendarClock} value={due.length} label="Due to generate" /><StatCard icon={Repeat2} value={recurring.length - active.length} label="Inactive templates" /></div>

    {generationMessage && <p className="mb-5 border border-blue/20 bg-blue/5 px-4 py-3 text-sm text-blue">{generationMessage}</p>}

    {recurring.length ? <section className="panel overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-line bg-canvas">{['Task', 'Client', 'Frequency', 'Next occurrence', 'Task status', 'Active', ''].map((label) => <th key={label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</th>)}</tr></thead><tbody>{recurring.map((task) => <tr className="border-b border-line last:border-0 hover:bg-zinc-50" key={task.id}>
      <td className="px-4 py-4"><p className="font-semibold">{task.title}</p><div className="mt-2 flex gap-2"><PriorityBadge priority={task.priority} />{task.recurrenceEndDate && <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">Ends {formatDate(task.recurrenceEndDate)}</Badge>}</div></td>
      <td className="px-4 py-4 text-sm">{clients.find((client) => client.id === task.clientId)?.name || 'Deleted client'}</td>
      <td className="px-4 py-4 text-sm font-medium">{recurrenceLabel(task)}</td>
      <td className="px-4 py-4"><p className="text-sm font-medium">{task.nextOccurrenceDate ? formatDate(task.nextOccurrenceDate, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not scheduled'}</p>{task.isRecurring && task.nextOccurrenceDate && task.nextOccurrenceDate <= today && <p className="mt-1 text-xs font-semibold text-orange-700">Due now</p>}</td>
      <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
      <td className="px-4 py-4"><label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-blue" checked={task.isRecurring} onChange={(event) => updateTask(task.id, {
        isRecurring: event.target.checked,
        nextOccurrenceDate: event.target.checked ? task.nextOccurrenceDate || today : task.nextOccurrenceDate,
        recurrenceEndDate: event.target.checked && task.recurrenceEndDate && task.recurrenceEndDate < today ? '' : task.recurrenceEndDate,
      })} />{task.isRecurring ? 'Active' : 'Inactive'}</label></td>
      <td className="px-4 py-4 text-right"><button className="button-secondary px-3 py-2" onClick={() => onEditTask(task)}>Edit</button></td>
    </tr>)}</tbody></table></section> : <EmptyState title="No recurring tasks" description="Edit or create a task and enable its recurring task settings." />}
  </>
}
