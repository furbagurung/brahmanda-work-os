import { useEffect, useRef, useState } from 'react'
import {
  BriefcaseBusiness, ExternalLink, FileText, Link2, Search, Users, X,
} from 'lucide-react'

import { StatusBadge } from './components'

const reportTitle = (report) => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(Date.UTC(report.year, report.month - 1, 1)))

function TypeBadge({ type }) {
  return <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">{type}</span>
}

function ResultRow({ result, onSelect }) {
  const Icon = result.type === 'Client' ? Users : result.type === 'Task' ? BriefcaseBusiness : result.type === 'Report' ? FileText : Link2
  return <button className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition last:border-0 hover:bg-zinc-50" onClick={() => onSelect(result)}>
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500"><Icon size={15} /></span>
    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{result.title}</span><span className="mt-1 block truncate text-xs text-zinc-500">{result.clientName || result.subtitle || 'Brahmanda Work OS'}</span></span>
    <span className="flex flex-col items-end gap-1.5"><TypeBadge type={result.type} />{result.status && (result.type === 'Task' ? <StatusBadge status={result.status} /> : <span className="text-[10px] font-medium text-zinc-400">{result.status}</span>)}</span>
  </button>
}

export default function GlobalSearch({
  open,
  clients,
  tasks,
  reports,
  recentClientIds,
  recentTaskIds,
  onClose,
  onSelect,
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  if (!open) return null

  const clientResults = clients.map((client) => ({
    type: 'Client',
    id: client.id,
    title: client.name,
    subtitle: client.contact,
    status: String(client.status || '').replaceAll('_', ' '),
    search: `${client.name} ${client.contact} ${client.email} ${client.phone}`,
  }))
  const taskResults = tasks.map((task) => ({
    type: 'Task',
    id: task.id,
    title: task.title,
    clientName: clients.find((client) => client.id === task.clientId)?.name || 'Deleted client',
    status: task.status,
    task,
    search: `${task.title} ${task.description} ${task.category} ${task.status}`,
  }))
  const reportResults = reports.map((report) => ({
    type: 'Report',
    id: report.id,
    title: `${reportTitle(report)} report`,
    clientName: report.clientName || clients.find((client) => client.id === report.clientId)?.name,
    status: report.status,
    report,
    search: `${reportTitle(report)} ${report.clientName} ${report.status}`,
  }))
  const proofResults = tasks.flatMap((task) => {
    const clientName = clients.find((client) => client.id === task.clientId)?.name || 'Deleted client'
    const attachments = task.attachments?.length
      ? task.attachments
      : task.proofLink
        ? [{ id: `${task.id}-proof`, title: 'Proof link', url: task.proofLink }]
        : []
    return attachments.map((attachment) => ({
      type: 'Proof',
      id: String(attachment.id || attachment.url),
      title: attachment.title,
      clientName,
      status: task.status,
      task,
      url: attachment.url,
      search: `${attachment.title} ${task.title} ${clientName} ${attachment.url}`,
    }))
  })

  const normalized = query.trim().toLowerCase()
  const allResults = [...clientResults, ...taskResults, ...reportResults, ...proofResults]
  const results = normalized
    ? allResults.filter((result) => `${result.title} ${result.clientName || ''} ${result.search || ''}`.toLowerCase().includes(normalized)).slice(0, 24)
    : []
  const recentResults = [
    ...recentClientIds.map((id) => clientResults.find((result) => result.id === id)),
    ...recentTaskIds.map((id) => taskResults.find((result) => result.id === id)),
  ].filter(Boolean).slice(0, 8)

  return <div className="fixed inset-0 z-[70] flex items-start justify-center bg-zinc-950/30 p-3 pt-[6vh] backdrop-blur-[1px] sm:p-6 sm:pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-label="Global search" className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl sm:max-h-[76vh]">
      <div className="flex items-center border-b border-zinc-200 px-4 focus-within:border-zinc-300"><Search size={17} className="shrink-0 text-zinc-400" /><input ref={inputRef} className="min-w-0 flex-1 px-3 py-3.5 text-[15px] outline-none focus:shadow-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients, tasks, reports, and proof links" /><kbd className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-400 sm:block">ESC</kbd><button className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onClick={onClose} aria-label="Close search"><X size={16} /></button></div>
      <div className="max-h-[64vh] overflow-y-auto">
        {!normalized && <div><div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5"><p className="text-[11px] font-semibold text-zinc-500">Recent items</p><p className="text-[11px] text-zinc-400">Ctrl + K</p></div>{recentResults.length ? recentResults.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} onSelect={onSelect} />) : <p className="p-8 text-center text-sm text-zinc-500">Recently opened clients and edited tasks will appear here.</p>}</div>}
        {normalized && <div><div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5"><p className="text-[11px] font-semibold text-zinc-500">{results.length} result{results.length === 1 ? '' : 's'}</p></div>{results.length ? results.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} onSelect={onSelect} />) : <p className="p-8 text-center text-sm text-zinc-500">No matching clients, tasks, reports, or proof links.</p>}</div>}
      </div>
      <footer className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-[11px] text-zinc-400"><span>Click a result to open it</span><span className="inline-flex items-center gap-1"><ExternalLink size={12} />Proof links open in a new tab</span></footer>
    </section>
  </div>
}
