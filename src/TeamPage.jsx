import { useEffect, useState } from 'react'
import { KeyRound, Pencil, Plus, UserRoundCog, UserX } from 'lucide-react'
import { Badge, EmptyState, Modal, Table } from './components'
import {
  changeUserPassword, createUser, deactivateUser, getUsers, updateUser,
} from './services/api'

const emptyUser = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'member',
  status: 'active',
}

const roleStyles = {
  admin: 'border-blue/20 bg-blue/5 text-blue',
  manager: 'border-amber-200 bg-amber-50 text-amber-800',
  member: 'border-zinc-200 bg-zinc-50 text-zinc-700',
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>
}

function UserForm({ user, onSave, onClose }) {
  const [form, setForm] = useState(user || emptyUser)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={submit}>
    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
      <Field label="Name"><input className="field" value={form.name} onChange={(event) => change('name', event.target.value)} autoComplete="off" required /></Field>
      <Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => change('email', event.target.value)} autoComplete="off" required /></Field>
      <Field label={form.id ? 'New password (optional)' : 'Password'}><input className="field" type="password" value={form.password || ''} onChange={(event) => change('password', event.target.value)} minLength="8" required={!form.id} autoComplete="new-password" /></Field>
      <Field label="Role"><select className="field" value={form.role} onChange={(event) => change('role', event.target.value)}><option value="admin">Admin</option><option value="manager">Manager</option><option value="member">Member</option></select></Field>
      <Field label="Status" ><select className="field" value={form.status} onChange={(event) => change('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
      {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
    </div>
    <div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add user'}</button></div>
  </form>
}

export default function TeamPage({ currentUser, onCurrentUserUpdate, onActivityRefresh }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const isAdmin = currentUser.role === 'admin'

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await getUsers())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const saveUser = async (form) => {
    let saved
    if (form.id) {
      saved = await updateUser(form.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
      })
      if (form.password) await changeUserPassword(form.id, form.password)
    } else {
      await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        status: form.status,
      })
    }

    if (saved && String(saved.id) === String(currentUser.id)) {
      onCurrentUserUpdate(saved)
    }
    await loadUsers()
    await onActivityRefresh?.()
  }

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.name}? They will be logged out immediately.`)) return
    setError('')
    try {
      await deactivateUser(user.id)
      await loadUsers()
      await onActivityRefresh?.()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const columns = [
    { key: 'name', label: 'User', render: (user) => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center bg-ink text-xs font-bold text-white">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div><p className="font-semibold">{user.name}</p><p className="mt-1 text-xs text-zinc-500">{user.email}</p></div></div> },
    { key: 'role', label: 'Role', render: (user) => <Badge className={roleStyles[user.role]}>{user.role}</Badge> },
    { key: 'status', label: 'Status', render: (user) => <Badge className={user.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}>{user.status}</Badge> },
    { key: 'created_at', label: 'Added', render: (user) => new Date(user.created_at.replace(' ', 'T')).toLocaleDateString() },
    ...(isAdmin ? [{ key: 'actions', label: '', render: (user) => <div className="flex justify-end gap-2"><button className="flex h-8 items-center gap-1.5 border border-line px-2.5 text-xs font-semibold hover:border-zinc-400" onClick={() => setEditing({ ...user, password: '' })}><Pencil size={13} />Edit</button><button className="flex h-8 items-center gap-1.5 border border-line px-2.5 text-xs font-semibold text-red-700 hover:border-red-300" onClick={() => handleDeactivate(user)} disabled={String(user.id) === String(currentUser.id) || user.status === 'inactive'}><UserX size={13} />Deactivate</button></div> }] : []),
  ]

  return <>
    <div className="mb-8 flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4 sm:gap-5"><span className="text-4xl font-light leading-none text-zinc-200 sm:text-5xl">08</span><div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Team</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{isAdmin ? 'Manage workspace users, roles, account status, and passwords.' : 'View your Brahmanda Work OS profile.'}</p></div></div>
      {isAdmin && <button className="button-primary self-start sm:self-auto" onClick={() => setEditing(emptyUser)}><Plus size={16} />Add user</button>}
    </div>

    {error && <p className="mb-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <div className="panel flex min-h-52 items-center justify-center text-sm text-zinc-500">Loading team…</div> : users.length ? <div className="panel"><Table columns={columns} data={users} /></div> : <EmptyState title="No users found" description="Add the first workspace user." />}

    {!isAdmin && users[0] && <div className="mt-6 panel p-5"><div className="flex items-start gap-4"><UserRoundCog className="text-blue" /><div><h2 className="font-semibold">Profile access</h2><p className="mt-1 text-sm text-zinc-500">Your {users[0].role} account can view this profile. User management requires an administrator.</p></div></div></div>}

    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit user' : 'Add user'} description={editing?.id ? 'Update account access and optionally set a new password.' : 'Create a secure Brahmanda Work OS account.'}>
      {editing && <UserForm user={editing} onSave={saveUser} onClose={() => setEditing(null)} />}
    </Modal>
  </>
}
