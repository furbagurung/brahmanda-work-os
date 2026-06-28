import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCopy, Link2, RefreshCw, ShieldOff } from 'lucide-react'

import { Badge, EmptyState } from './components'
import {
  createPortalShare, deactivatePortalShare, getPortalShares,
  recordPortalShareCopy, regeneratePortalShare,
} from './services/api'
import { formatDate } from './utils'

const portalUrl = (token) => `${window.location.origin}/portal/${token}`
const expiryValue = (date) => date ? `${date} 23:59:59` : null

export default function ReportShareManager({
  reportId = '',
  clientId = '',
  allowCreate = true,
  onActivityRefresh,
}) {
  const [shares, setShares] = useState([])
  const [tokens, setTokens] = useState({})
  const [expiryDate, setExpiryDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadShares = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setShares(await getPortalShares(reportId ? { report_id: reportId } : { client_id: clientId }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [clientId, reportId])

  useEffect(() => { loadShares() }, [loadShares])

  const createShare = async () => {
    setWorkingId('create')
    setError('')
    try {
      const result = await createPortalShare({ report_id: Number(reportId), expires_at: expiryValue(expiryDate) })
      setTokens((current) => ({ ...current, [result.id]: result.token }))
      setMessage('Share link generated. Copy it now or regenerate it later.')
      toast.success('Share link generated.')
      await loadShares()
      await onActivityRefresh?.()
    } catch (requestError) {
      setError(requestError.message)
      toast.error(requestError.message)
    } finally {
      setWorkingId('')
    }
  }

  const regenerate = async (share) => {
    setWorkingId(`regenerate-${share.id}`)
    setError('')
    try {
      const result = await regeneratePortalShare(share.id, {
        expires_at: expiryDate ? expiryValue(expiryDate) : share.expires_at,
      })
      setTokens((current) => ({ ...current, [share.id]: result.token }))
      setMessage('A new share link was generated. The previous link no longer works.')
      toast.success('Share link regenerated.')
      await loadShares()
      await onActivityRefresh?.()
    } catch (requestError) {
      setError(requestError.message)
      toast.error(requestError.message)
    } finally {
      setWorkingId('')
    }
  }

  const deactivate = async (share) => {
    setWorkingId(`deactivate-${share.id}`)
    setError('')
    try {
      await deactivatePortalShare(share.id)
      setTokens((current) => {
        const next = { ...current }
        delete next[share.id]
        return next
      })
      setMessage('Share link deactivated.')
      toast.success('Share link deactivated.')
      await loadShares()
      await onActivityRefresh?.()
    } catch (requestError) {
      setError(requestError.message)
      toast.error(requestError.message)
    } finally {
      setWorkingId('')
    }
  }

  const copyShare = async (share) => {
    const token = tokens[share.id]
    if (!token) {
      setMessage('The secure token is not stored after generation. Regenerate this link to copy a new URL.')
      return
    }
    await navigator.clipboard.writeText(portalUrl(token))
    setMessage('Share link copied.')
    toast.success('Share link copied.')
    recordPortalShareCopy(share.id).then(() => onActivityRefresh?.()).catch(() => {})
  }

  return <div>
    {allowCreate && reportId && <div className="flex flex-col gap-3 border-b border-line bg-zinc-50/70 p-4 sm:flex-row sm:items-end sm:p-5">
      <label className="block flex-1"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">Optional expiry date</span><input className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700 outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/10" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></label>
      <button className="button-primary" disabled={workingId === 'create'} onClick={createShare}><Link2 size={15} />{workingId === 'create' ? 'Generating…' : 'Generate Share Link'}</button>
    </div>}
    {message && <p className="border-b border-blue/15 bg-blue/5 px-5 py-3 text-sm font-medium text-blue">{message}</p>}
    {error && <p className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="p-5 text-sm text-zinc-500">Loading share links…</p> : shares.length ? <div className="divide-y divide-line">{shares.map((share) => {
      const expired = share.expires_at && new Date(share.expires_at.replace(' ', 'T')) <= new Date()
      const active = Number(share.is_active) === 1 && !expired
      return <article className="grid gap-4 p-5 transition hover:bg-zinc-50/70 lg:grid-cols-[1fr_auto] lg:items-center" key={share.id}>
        <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{share.client_name} · {new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(`2026-${String(share.report_month).padStart(2, '0')}-01T00:00:00Z`))} {share.report_year}</p><Badge className={active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}>{active ? 'Active' : expired ? 'Expired' : 'Inactive'}</Badge></div><p className="mt-1 text-xs text-zinc-500">Token ending ···{share.public_token_preview}{share.expires_at ? ` · Expires ${formatDate(String(share.expires_at).slice(0, 10))}` : ' · No expiry'}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="button-secondary px-3 py-2" disabled={!active} onClick={() => copyShare(share)}><ClipboardCopy size={14} />Copy Link</button>
          <button className="button-secondary px-3 py-2" disabled={workingId === `regenerate-${share.id}`} onClick={() => regenerate(share)}><RefreshCw size={14} />Regenerate</button>
          {active && <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" disabled={workingId === `deactivate-${share.id}`} onClick={() => deactivate(share)}><ShieldOff size={14} />Deactivate</button>}
        </div>
      </article>
    })}</div> : <EmptyState title="No share links" description={reportId ? 'Generate a view-only link for this saved report.' : 'No reports for this client have been shared.'} />}
  </div>
}
