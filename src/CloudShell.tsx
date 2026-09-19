import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import App from './App'
import { demoData, loadData, uid } from './data'
import { isSupabaseConfigured, supabase } from './supabase'
import type { BudgetData, Participant } from './types'

export interface Household {
  id: string
  name: string
  invite_code: string
  budget_data: BudgetData
  created_by: string
  updated_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  display_name: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface CloudControls {
  user: User
  household: Household
  households: Household[]
  members: HouseholdMember[]
  syncState: 'saved' | 'saving' | 'error'
  selectHousehold: (id: string) => void
  createHousehold: (name: string) => Promise<void>
  joinHousehold: (code: string) => Promise<void>
  signOut: () => Promise<void>
}

const memberColors = ['#5b7cfa', '#f38db8', '#50b99b', '#f3ad55', '#9f7aea']

function mergeMembers(data: BudgetData, members: HouseholdMember[]): BudgetData {
  const participants = data.participants.map(p => ({ ...p }))
  const linkedIds = new Set(participants.filter(p => p.userId).map(p => p.userId))

  members.slice().sort((a, b) => a.joined_at.localeCompare(b.joined_at)).forEach((member, index) => {
    const existing = participants.find(p => p.userId === member.user_id)
    if (existing) {
      existing.name = member.display_name
      return
    }
    if (linkedIds.has(member.user_id)) return
    const unlinked = participants.find(p => !p.userId)
    if (unlinked) {
      unlinked.userId = member.user_id
      unlinked.name = member.display_name
    } else {
      participants.push({ id: uid(), name: member.display_name, share: 0, color: memberColors[index % memberColors.length], userId: member.user_id })
    }
    linkedIds.add(member.user_id)
  })

  return { ...data, participants }
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`
          }
        })
    setLoading(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('Проверьте почту и подтвердите регистрацию.')
  }

  return <main className="auth-page">
    <section className="auth-brand"><div className="auth-logo">В</div><h1>Вместе</h1><p>Семейный бюджет, который всегда под рукой.</p></section>
    <section className="auth-card">
      <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }}>Войти</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setMessage('') }}>Регистрация</button></div>
      <form onSubmit={submit}>
        {mode === 'signup' && <label><span>Ваше имя</span><input required value={name} onChange={e => setName(e.target.value)} placeholder="Анатолий" autoComplete="name" /></label>}
        <label><span>Email</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" /></label>
        <label><span>Пароль</span><input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {message && <p className={message.includes('Проверьте') ? 'auth-success' : 'auth-error'}>{message}</p>}
        <button className="primary-button" disabled={loading}>{loading ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
      </form>
      <small>Данные семьи доступны только приглашённым участникам.</small>
    </section>
  </main>
}

function HouseholdOnboarding({ user, refresh }: { user: User; refresh: () => Promise<void> }) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('Наша семья')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    const local = structuredClone(loadData())
    const displayName = String(user.user_metadata.display_name || user.email?.split('@')[0] || 'Участник')
    if (local.participants[0]) local.participants[0] = { ...local.participants[0], name: displayName, userId: user.id }
    const { error: rpcError } = await supabase.rpc('create_household', { p_name: name.trim(), p_budget_data: local })
    setLoading(false)
    if (rpcError) setError(rpcError.message); else await refresh()
  }

  const join = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    const { error: rpcError } = await supabase.rpc('join_household', { p_invite_code: code.trim().toUpperCase() })
    setLoading(false)
    if (rpcError) setError(rpcError.message); else await refresh()
  }

  return <main className="auth-page">
    <section className="auth-brand"><div className="auth-logo">В</div><h1>Начнём вместе</h1><p>Создайте семейный бюджет или присоединитесь по коду.</p></section>
    <section className="auth-card">
      <div className="auth-tabs"><button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>Создать</button><button className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>Вступить</button></div>
      {tab === 'create' ? <form onSubmit={create}><label><span>Название семьи</span><input required value={name} onChange={e => setName(e.target.value)} /></label><button className="primary-button" disabled={loading}>{loading ? 'Создаём…' : 'Создать семейный бюджет'}</button></form>
        : <form onSubmit={join}><label><span>Код приглашения</span><input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Например, A1B2C3D4E5F6" /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? 'Подключаем…' : 'Присоединиться'}</button></form>}
      {tab === 'create' && error && <p className="auth-error">{error}</p>}
      <button className="auth-signout" onClick={() => supabase.auth.signOut()}>Выйти из аккаунта</button>
    </section>
  </main>
}

export default function CloudShell() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [households, setHouseholds] = useState<Household[]>([])
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem('vmeste-active-household') || '')
  const [loading, setLoading] = useState(false)
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'error'>('saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  const refresh = async (preferredId?: string) => {
    if (!session?.user) return
    setLoading(true)
    const { data: memberRows, error } = await supabase.from('household_members').select('*').eq('user_id', session.user.id).order('joined_at')
    if (error || !memberRows?.length) { setHouseholds([]); setMembers([]); setLoading(false); return }
    const ids = memberRows.map(row => row.household_id)
    const [{ data: householdRows }, { data: allMemberRows }] = await Promise.all([
      supabase.from('households').select('*').in('id', ids).order('created_at'),
      supabase.from('household_members').select('*').in('household_id', ids).order('joined_at')
    ])
    const merged = (householdRows || []).map(h => ({ ...h, budget_data: mergeMembers(h.budget_data as BudgetData, (allMemberRows || []).filter(m => m.household_id === h.id)) })) as Household[]
    setHouseholds(merged); setMembers((allMemberRows || []) as HouseholdMember[])
    const requestedId = preferredId || activeId
    if (!requestedId || !ids.includes(requestedId)) {
      const nextId = ids[0]; setActiveId(nextId); localStorage.setItem('vmeste-active-household', nextId)
    } else if (preferredId) {
      setActiveId(preferredId); localStorage.setItem('vmeste-active-household', preferredId)
    }
    setLoading(false)
  }

  useEffect(() => { if (session?.user) refresh() }, [session?.user.id])

  const activeHousehold = households.find(h => h.id === activeId) || households[0]
  const activeMembers = useMemo(() => members.filter(m => m.household_id === activeHousehold?.id), [members, activeHousehold?.id])

  useEffect(() => {
    if (!activeHousehold?.id) return
    const channel = supabase.channel(`household:${activeHousehold.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${activeHousehold.id}` }, payload => {
        const incoming = payload.new as Household
        setHouseholds(current => current.map(h => h.id === incoming.id ? { ...incoming, budget_data: mergeMembers(incoming.budget_data, activeMembers) } : h))
        setSyncState('saved')
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${activeHousehold.id}` }, () => { refresh(activeHousehold.id) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeHousehold?.id, activeMembers.length])

  const saveBudget = (budgetData: BudgetData) => {
    if (!activeHousehold || !session?.user) return
    setSyncState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('households').update({ budget_data: budgetData }).eq('id', activeHousehold.id)
      setSyncState(error ? 'error' : 'saved')
    }, 700)
  }

  const selectHousehold = (id: string) => { setActiveId(id); localStorage.setItem('vmeste-active-household', id) }
  const createHousehold = async (name: string) => {
    if (!session?.user) return
    const fresh = structuredClone(demoData)
    const displayName = String(session.user.user_metadata.display_name || session.user.email?.split('@')[0] || 'Участник')
    if (fresh.participants[0]) fresh.participants[0] = { ...fresh.participants[0], name: displayName, userId: session.user.id }
    const { data, error } = await supabase.rpc('create_household', { p_name: name, p_budget_data: fresh })
    if (error) throw error
    if (data) selectHousehold(String(data))
    await refresh(data ? String(data) : undefined)
  }
  const joinHousehold = async (code: string) => {
    const { data, error } = await supabase.rpc('join_household', { p_invite_code: code.trim().toUpperCase() })
    if (error) throw error
    if (data) selectHousehold(String(data))
    await refresh(data ? String(data) : undefined)
  }

  if (!isSupabaseConfigured) return <App />
  if (!authReady || loading) return <div className="app-loader"><div className="auth-logo">В</div><span>Загружаем бюджет…</span></div>
  if (!session) return <AuthScreen />
  if (!activeHousehold) return <HouseholdOnboarding user={session.user} refresh={refresh} />

  const cloud: CloudControls = {
    user: session.user,
    household: activeHousehold,
    households,
    members: activeMembers,
    syncState,
    selectHousehold,
    createHousehold,
    joinHousehold,
    signOut: async () => { await supabase.auth.signOut() }
  }

  return <App key={activeHousehold.id} initialData={activeHousehold.budget_data} currentUserId={session.user.id} onDataChange={saveBudget} cloud={cloud} />
}
