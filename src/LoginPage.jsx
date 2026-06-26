import { useState } from 'react'
import { Command, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { login } from './services/auth'
import { clearRememberedEmail, getRememberedEmail, saveRememberedEmail } from './services/authStorage'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(() => getRememberedEmail() || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await login(email, password)
      if (rememberMe) {
        saveRememberedEmail(email)
      } else {
        clearRememberedEmail()
      }
      onLogin(user)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#eef4ff] lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden border-r border-line bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),transparent_35%),linear-gradient(180deg,#eef6ff_0%,#f8fbff_100%)] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-3xl bg-blue text-white"><Command size={19} /></span>
          <span className="text-sm font-bold tracking-tight">BRAHMANDA <span className="text-blue">OS</span></span>
        </div>
        <div className="max-w-xl">
          <span className="text-8xl font-light leading-none text-blue/10">01</span>
          <h1 className="-mt-5 text-5xl font-semibold tracking-[-0.04em] text-ink">Agency work,<br />in one place.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-zinc-500">Manage client delivery, tasks, daily logs, reports, and billing for Brahmanda Tech.</p>
        </div>
        <p className="text-xs text-zinc-400">Brahmanda Tech internal workspace</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-3xl bg-blue text-white"><Command size={19} /></span>
            <span className="text-sm font-bold tracking-tight">BRAHMANDA <span className="text-blue">OS</span></span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">Internal access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Use your Brahmanda Work OS account.</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Email</span>
              <span className="flex items-center rounded-2xl border border-line bg-white px-3 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/10">
                <Mail size={16} className="shrink-0 text-zinc-400" />
                <input className="field border-none bg-transparent px-3 py-3 text-sm outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@brahmandatech.com" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Password</span>
              <span className="flex items-center rounded-2xl border border-line bg-white px-3 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/10">
                <LockKeyhole size={16} className="shrink-0 text-zinc-400" />
                <input className="field border-none bg-transparent px-3 py-3 text-sm outline-none" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Enter password" />
                <button type="button" className="text-zinc-400 hover:text-ink" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>

            {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}

            <label className="flex items-center gap-3 text-sm text-zinc-600">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-blue" />
              Remember me
            </label>

            <button className="button-primary w-full py-3 rounded-2xl" disabled={loading} type="submit">
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
