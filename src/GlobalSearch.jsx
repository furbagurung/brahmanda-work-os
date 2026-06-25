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
  const styles = {
    Client: 'border-blue/20 bg-blue/5 text-blue',
    Task: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    Report: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Proof: 'border-orange-200 bg-orange-50 text-orange-800',
  }
  return <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[type]}`}>{type}</span>
}

function ResultRow({ result, onSelect }) {
  const Icon = result.type === 'Client' ? Users : result.type === 'Task' ? BriefcaseBusiness : result.type === 'Report' ? FileText : Link2
  return <button className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-canvas" onClick={() => onSelect(result)}>
    <span className="flex h-8 w-8 items-center justify-center border border-line text-zinc-500"><Icon size={15} /></span>
    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{result.title}</span><span className="mt-1 block truncate text-xs text-zinc-500">{result.clientName || result.subtitle || 'Brahmanda Work OS'}</span></span>
    <span className="flex flex-col items-end gap-2"><TypeBadge type={result.type} />{result.status && (result.type === 'Task' ? <StatusBadge status={result.status} /> : <span className="text-[11px] font-medium text-zinc-500">{result.status}</span>)}</span>
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

  return <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="max-h-[76vh] w-full max-w-2xl overflow-hidden border border-zinc-300 bg-white shadow-2xl">
      <div className="flex items-center border-b border-line px-4"><Search size={18} className="shrink-0 text-zinc-400" /><input ref={inputRef} className="min-w-0 flex-1 px-3 py-4 text-base outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients, tasks, reports, and proof links" /><kbd className="hidden border border-line bg-canvas px-2 py-1 text-[10px] font-semibold text-zinc-500 sm:block">ESC</kbd><button className="ml-3 flex h-8 w-8 items-center justify-center hover:bg-canvas" onClick={onClose} aria-label="Close search"><X size={17} /></button></div>
      <div className="max-h-[64vh] overflow-y-auto">
        {!normalized && <div><div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-2.5"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Recent items</p><p className="text-[11px] text-zinc-400">Ctrl + K</p></div>{recentResults.length ? recentResults.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} onSelect={onSelect} />) : <p className="p-8 text-center text-sm text-zinc-500">Recently opened clients and edited tasks will appear here.</p>}</div>}
        {normalized && <div><div className="border-b border-line bg-canvas px-4 py-2.5"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{results.length} result{results.length === 1 ? '' : 's'}</p></div>{results.length ? results.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} onSelect={onSelect} />) : <p className="p-8 text-center text-sm text-zinc-500">No matching clients, tasks, reports, or proof links.</p>}</div>}
      </div>
      <footer className="flex items-center justify-between border-t border-line bg-canvas px-4 py-2.5 text-[11px] text-zinc-500"><span>Click a result to open it</span><span className="inline-flex items-center gap-1"><ExternalLink size={12} />Proof links open in a new tab</span></footer>
    </section>
  </div>
}
