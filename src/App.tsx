import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { demoData, loadData, saveData, uid } from './data'
import type { BudgetData, BudgetScope, Category, Goal, IncomeSource, Participant, PeriodType, Purchase, Transaction } from './types'

type Page = 'home' | 'operations' | 'add' | 'plan' | 'settings'
type IconName = 'home' | 'list' | 'plus' | 'plan' | 'settings' | 'arrow' | 'bell' | 'mic' | 'calendar' | 'wallet' | 'close' | 'check' | 'trash' | 'edit' | 'download' | 'upload' | 'moon' | 'chart' | 'target' | 'swap' | 'chevron'

const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => {
  const paths: Record<IconName, React.ReactElement> = {
    home: <><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    plan: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    arrow: <><path d="m5 12 14 0M13 6l6 6-6 6"/></>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></>, wallet: <><path d="M4 5h15a2 2 0 0 1 2 2v12H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>, check: <><path d="m5 12 4 4L19 6"/></>, trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>, edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM14 7l3 3"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></>, upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>, moon: <><path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/></>,
    chart: <><path d="M4 19V9M10 19V4M16 19v-7M22 19H2"/></>, target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>, swap: <><path d="m7 7 3-3-3-3M10 4H3v7M17 17l-3 3 3 3M14 20h7v-7"/></>, chevron: <><path d="m9 18 6-6-6-6"/></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const money = (value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)
const shortDate = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
const today = () => new Date().toISOString().slice(0, 10)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function getPeriod(data: BudgetData) {
  const now = new Date(); let start: Date; let end: Date
  if (data.settings.periodType === 'custom') {
    start = new Date(`${data.settings.customStart}T00:00:00`); end = new Date(`${data.settings.customEnd}T23:59:59`)
  } else if (data.settings.periodType === 'payday') {
    const days = data.incomeSources.filter(i => i.enabled).flatMap(i => i.days).sort((a,b) => a-b)
    const validDays = days.length ? days : [1]
    const anchors: Date[] = []
    for (let offset = -1; offset <= 1; offset++) for (const day of validDays) anchors.push(new Date(now.getFullYear(), now.getMonth() + offset, day))
    anchors.sort((a,b) => a.getTime() - b.getTime())
    start = [...anchors].reverse().find(d => d <= now) || anchors[0]
    end = anchors.find(d => d > now) || new Date(now.getFullYear(), now.getMonth() + 1, 1)
    end = new Date(end.getTime() - 1)
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }
  return { start, end, startISO: start.toISOString().slice(0,10), endISO: end.toISOString().slice(0,10) }
}

function nextIncome(data: BudgetData) {
  const now = new Date(); const candidates: { date: Date; source: IncomeSource }[] = []
  data.incomeSources.filter(s => s.enabled).forEach(source => source.days.forEach(day => {
    for (let offset = 0; offset <= 2; offset++) { const date = new Date(now.getFullYear(), now.getMonth() + offset, day); if (date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) candidates.push({ date, source }) }
  }))
  return candidates.sort((a,b) => a.date.getTime() - b.date.getTime())[0]
}

function App() {
  const [data, setData] = useState<BudgetData>(loadData)
  const [page, setPage] = useState<Page>('home')
  const [sheet, setSheet] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  useEffect(() => saveData(data), [data])
  useEffect(() => {
    const dark = data.settings.theme === 'dark' || (data.settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101115' : '#f6f7f9')
  }, [data.settings.theme])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 2800); return () => clearTimeout(t) }, [notice])

  const period = useMemo(() => getPeriod(data), [data])
  const periodTransactions = data.transactions.filter(t => t.date >= period.startISO && t.date <= period.endISO)
  const totalIncome = periodTransactions.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
  const totalExpense = periodTransactions.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
  const balance = totalIncome - totalExpense
  const sharedPool = totalIncome * data.settings.allocation.shared / 100
  const personalPool = totalIncome * data.settings.allocation.personal / 100
  const categoryBudget = (cat: Category) => cat.mode === 'fixed' ? cat.value : (cat.scope === 'shared' ? sharedPool : personalPool) * cat.value / 100
  const categorySpent = (id: string) => periodTransactions.filter(t => t.type === 'expense' && t.categoryId === id).reduce((s,t) => s+t.amount,0)
  const transferEffect = (id: string) => data.transfers.filter(t => t.date >= period.startISO && t.date <= period.endISO).reduce((s,t) => s + (t.toCategoryId === id ? t.amount : 0) - (t.fromCategoryId === id ? t.amount : 0),0)
  const categoryLeft = (cat: Category) => categoryBudget(cat) + transferEffect(cat.id) - categorySpent(cat.id)
  const next = nextIncome(data)
  const daysLeft = Math.max(1, Math.ceil((period.end.getTime() - Date.now()) / 86400000))
  const spendable = data.categories.filter(c => !c.archived && c.id !== 'shared-savings' && (data.settings.personalEnabled || c.scope === 'shared')).reduce((s,c) => s + Math.max(0, categoryLeft(c)), 0)
  const daily = spendable / daysLeft
  const overspent = data.categories.filter(c => !c.archived && categoryLeft(c) < 0)

  const patchData = (patch: Partial<BudgetData>) => setData(prev => ({ ...prev, ...patch }))
  const openAdd = () => { setEditingTransaction(null); setSheet('transaction') }
  const showNotice = (text: string) => setNotice(text)
  const navigate = (nextPage: Page) => { if (nextPage === 'add') openAdd(); else setPage(nextPage) }

  const content = page === 'home' ? <HomePage {...{data, balance, daily, next, period, categoryBudget, categorySpent, categoryLeft, overspent, setSheet, setPage, setEditingTransaction}} />
    : page === 'operations' ? <OperationsPage {...{data, periodTransactions, patchData, setSheet, setEditingTransaction}} />
    : page === 'plan' ? <PlanPage {...{data, categoryBudget, categorySpent, categoryLeft, patchData, setSheet, showNotice}} />
    : <SettingsPage {...{data, setData, patchData, setSheet, showNotice}} />

  return <div className="app-shell">
    <main>{content}</main>
    <BottomNav current={page} navigate={navigate} />
    {sheet === 'transaction' && <TransactionSheet data={data} initial={editingTransaction} onClose={() => setSheet(null)} onSave={transaction => {
      patchData({ transactions: editingTransaction ? data.transactions.map(t => t.id === transaction.id ? transaction : t) : [transaction, ...data.transactions] })
      setSheet(null); showNotice(editingTransaction ? 'Операция обновлена' : transaction.type === 'expense' ? 'Расход добавлен' : 'Доход добавлен')
    }} />}
    {sheet === 'voice' && <VoiceSheet data={data} onClose={() => setSheet(null)} onConfirm={draft => { setEditingTransaction(draft); setSheet('transaction') }} />}
    {sheet === 'category' && <CategorySheet data={data} onClose={() => setSheet(null)} onSave={category => { patchData({ categories: [...data.categories, category] }); setSheet(null); showNotice('Категория создана') }} />}
    {sheet === 'participant' && <ParticipantSheet onClose={() => setSheet(null)} onSave={participant => { patchData({participants:[...data.participants,participant]}); setSheet(null); showNotice('Участник добавлен') }} />}
    {sheet === 'income' && <IncomeSheet onClose={() => setSheet(null)} onSave={source => { patchData({incomeSources:[...data.incomeSources,source]}); setSheet(null); showNotice('Источник дохода добавлен') }} />}
    {sheet === 'goal' && <GoalSheet onClose={() => setSheet(null)} onSave={goal => { patchData({goals:[...data.goals,goal]}); setSheet(null); showNotice('Цель создана') }} />}
    {sheet === 'transfer' && <TransferSheet data={data} onClose={() => setSheet(null)} onSave={transfer => { patchData({transfers:[transfer,...data.transfers]}); setSheet(null); showNotice('Перевод выполнен') }} />}
    {sheet?.startsWith('category:') && <CategoryDetail data={data} categoryId={sheet.split(':')[1]} periodTransactions={periodTransactions} categoryBudget={categoryBudget} categorySpent={categorySpent} categoryLeft={categoryLeft} onClose={() => setSheet(null)} onUpdate={(category:Category)=>{patchData({categories:data.categories.map(c=>c.id===category.id?category:c)});showNotice('Категория обновлена')}} onDelete={(id:string)=>{patchData({categories:data.categories.filter(c=>c.id!==id),purchases:data.purchases.filter(p=>p.categoryId!==id)});setSheet(null);showNotice('Категория удалена')}} />}
    {notice && <div className="toast"><Icon name="check" />{notice}</div>}
  </div>
}

function PageHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: React.ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>{action}</header>
}

function HomePage({ data, balance, daily, next, period, categoryBudget, categorySpent, categoryLeft, overspent, setSheet, setPage, setEditingTransaction }: any) {
  const planned = data.purchases.filter((p: Purchase) => !p.bought).slice(0,3)
  const recent = data.transactions.slice().sort((a: Transaction,b: Transaction) => b.date.localeCompare(a.date)).slice(0,4)
  return <div className="page home-page">
    <PageHeader eyebrow="Семейный бюджет" title="Добрый день 👋" action={<button className="icon-button" aria-label="Уведомления"><Icon name="bell" /></button>} />
    <section className="hero-card">
      <div className="hero-top"><span>Общий остаток</span><span className="status-dot">В плане</span></div>
      <div className="hero-amount">{money(balance)}</div>
      <div className="hero-meta"><div><small>Можно в день</small><strong>{money(daily)}</strong></div><div className="divider"/><div><small>Следующий доход</small><strong>{next ? new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(next.date) : 'Не задан'}</strong></div></div>
      <div className="hero-period"><Icon name="calendar" size={16}/>{shortDate(period.startISO)} — {shortDate(period.endISO)}</div>
    </section>

    <div className="quick-row">
      <button className="quick-expense" onClick={() => { setEditingTransaction(null); setSheet('transaction') }}><span><Icon name="plus" /></span><div><b>Быстрый расход</b><small>Записать покупку</small></div><Icon name="chevron" /></button>
      <button className="voice-button" onClick={() => setSheet('voice')} aria-label="Голосовой ввод"><Icon name="mic" /></button>
    </div>

    {overspent.length > 0 && <button className="warning-card" onClick={() => setSheet(`category:${overspent[0].id}`)}><span className="warning-icon">!</span><div><b>Есть перерасход</b><small>{overspent.map((c: Category) => c.name).join(', ')}</small></div><Icon name="chevron" /></button>}

    <SectionTitle title="Категории" action="Все" onClick={() => setPage('plan')} />
    <div className="category-grid">
      {data.categories.filter((c: Category) => !c.archived && c.scope === 'shared').slice(0,4).map((cat: Category) => {
        const budget=categoryBudget(cat), spent=categorySpent(cat.id), left=categoryLeft(cat), pct=budget ? spent/budget*100 : 0
        return <button key={cat.id} className="category-card" onClick={() => setSheet(`category:${cat.id}`)}>
          <div className="cat-head"><span className="emoji" style={{background:`${cat.color}20`}}>{cat.emoji}</span><span className={`mini-status ${pct>100?'danger':pct>80?'warn':'ok'}`}/></div>
          <b>{cat.name}</b><strong className={left<0?'negative':''}>{money(left)}</strong><small>из {money(budget)}</small>
          <Progress value={pct} color={pct>100?'var(--red)':pct>80?'var(--yellow)':cat.color}/>
        </button>
      })}
    </div>

    <SectionTitle title="Плановые покупки" action={`${planned.length} в плане`} onClick={() => setPage('plan')} />
    <section className="list-card compact-list">{planned.map((item: Purchase) => <div className="list-row" key={item.id}><span className="check-empty"/><div className="grow"><b>{item.name}</b><small>{data.categories.find((c:Category)=>c.id===item.categoryId)?.name}</small></div><strong>{money(item.price)}</strong></div>)}{!planned.length && <Empty text="Пока ничего не запланировано"/>}</section>

    <SectionTitle title="Последние операции" action="Все" onClick={() => setPage('operations')} />
    <section className="list-card transaction-list">{recent.map((t: Transaction) => <TransactionRow key={t.id} transaction={t} data={data}/>)}</section>
  </div>
}

function SectionTitle({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) { return <div className="section-title"><h2>{title}</h2>{action && <button onClick={onClick}>{action}<Icon name="chevron" size={16}/></button>}</div> }
function Progress({ value, color }: { value: number; color: string }) { return <div className="progress"><i style={{width:`${clamp(value,0,100)}%`,background:color}}/></div> }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div> }

function TransactionRow({ transaction:t, data, onClick }: { transaction: Transaction; data: BudgetData; onClick?:()=>void }) {
  const cat=data.categories.find(c=>c.id===t.categoryId), person=data.participants.find(p=>p.id===t.participantId)
  return <button className="transaction-row" onClick={onClick}><span className="emoji" style={{background:t.type==='income'?'var(--green-soft)':`${cat?.color || '#aaa'}20`}}>{t.type==='income'?'↙':cat?.emoji || '•'}</span><div className="grow"><b>{t.comment || (t.type==='income'?'Доход':cat?.name)}</b><small>{shortDate(t.date)} · {person?.name || 'Участник'}</small></div><strong className={t.type==='income'?'positive':''}>{t.type==='income'?'+':'−'} {money(t.amount)}</strong></button>
}

function OperationsPage({data, periodTransactions, patchData, setSheet, setEditingTransaction}: any) {
  const [filter,setFilter]=useState<'all'|'expense'|'income'>('all')
  const list=periodTransactions.filter((t:Transaction)=>filter==='all'||t.type===filter).sort((a:Transaction,b:Transaction)=>b.date.localeCompare(a.date))
  const income=periodTransactions.filter((t:Transaction)=>t.type==='income').reduce((s:number,t:Transaction)=>s+t.amount,0)
  const expense=periodTransactions.filter((t:Transaction)=>t.type==='expense').reduce((s:number,t:Transaction)=>s+t.amount,0)
  return <div className="page"><PageHeader eyebrow="Текущий период" title="Операции" action={<button className="round-add" onClick={()=>{setEditingTransaction(null);setSheet('transaction')}}><Icon name="plus"/></button>}/>
    <div className="summary-pills"><div><small>Доходы</small><b className="positive">+ {money(income)}</b></div><div><small>Расходы</small><b>− {money(expense)}</b></div></div>
    <div className="segmented"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Все</button><button className={filter==='expense'?'active':''} onClick={()=>setFilter('expense')}>Расходы</button><button className={filter==='income'?'active':''} onClick={()=>setFilter('income')}>Доходы</button></div>
    <section className="list-card transaction-list large">{list.map((t:Transaction)=><div className="swipe-row" key={t.id}><TransactionRow transaction={t} data={data} onClick={()=>{setEditingTransaction(t);setSheet('transaction')}}/><button className="delete-inline" aria-label="Удалить" onClick={()=>patchData({transactions:data.transactions.filter((x:Transaction)=>x.id!==t.id)})}><Icon name="trash" size={18}/></button></div>)}{!list.length&&<Empty text="Операций пока нет"/>}</section>
  </div>
}

function PlanPage({data,categoryBudget,categorySpent,categoryLeft,patchData,setSheet,showNotice}:any) {
  const [tab,setTab]=useState<'categories'|'purchases'|'goals'|'analytics'>('categories')
  const activeCats=data.categories.filter((c:Category)=>!c.archived&&(data.settings.personalEnabled||c.scope==='shared'))
  return <div className="page"><PageHeader eyebrow="План и контроль" title="Бюджет" action={<button className="round-add" onClick={()=>setSheet(tab==='goals'?'goal':tab==='categories'?'category':'transfer')}><Icon name="plus"/></button>}/>
    <div className="tab-scroll"><button className={tab==='categories'?'active':''} onClick={()=>setTab('categories')}>Категории</button><button className={tab==='purchases'?'active':''} onClick={()=>setTab('purchases')}>Покупки</button><button className={tab==='goals'?'active':''} onClick={()=>setTab('goals')}>Цели</button><button className={tab==='analytics'?'active':''} onClick={()=>setTab('analytics')}>Аналитика</button></div>
    {tab==='categories'&&<>
      <button className="transfer-banner" onClick={()=>setSheet('transfer')}><span><Icon name="swap"/></span><div><b>Перевести между категориями</b><small>Перераспределить доступный лимит</small></div><Icon name="chevron"/></button>
      <div className="budget-list">{activeCats.map((cat:Category)=>{const budget=categoryBudget(cat),spent=categorySpent(cat.id),left=categoryLeft(cat),pct=budget?spent/budget*100:0;return <button key={cat.id} className="budget-card" onClick={()=>setSheet(`category:${cat.id}`)}><div className="budget-title"><span className="emoji" style={{background:`${cat.color}20`}}>{cat.emoji}</span><div className="grow"><b>{cat.name}</b><small>{cat.mode==='percent'?`${cat.value}% бюджета`:money(cat.value)} · {cat.scope==='shared'?'Общий':'Личный'}</small></div><Icon name="chevron"/></div><div className="budget-numbers"><span><small>Лимит</small><b>{money(budget)}</b></span><span><small>Потрачено</small><b>{money(spent)}</b></span><span><small>Остаток</small><b className={left<0?'negative':''}>{money(left)}</b></span></div><Progress value={pct} color={pct>100?'var(--red)':pct>80?'var(--yellow)':cat.color}/></button>})}</div>
    </>}
    {tab==='purchases'&&<Purchases data={data} patchData={patchData} setSheet={setSheet} showNotice={showNotice}/>} 
    {tab==='goals'&&<Goals data={data} patchData={patchData}/>} 
    {tab==='analytics'&&<Analytics data={data} categoryBudget={categoryBudget} categorySpent={categorySpent}/>} 
  </div>
}

function Purchases({data,patchData,setSheet,showNotice}:any) {
  const [draft,setDraft]=useState({name:'',price:'',categoryId:data.categories[0]?.id||''})
  const add=(e:FormEvent)=>{e.preventDefault();if(!draft.name||!draft.price)return;patchData({purchases:[...data.purchases,{id:uid(),name:draft.name,price:Number(draft.price),categoryId:draft.categoryId,bought:false}]});setDraft({...draft,name:'',price:''})}
  const toggle=(item:Purchase)=>{if(!item.bought){const tx:Transaction={id:uid(),type:'expense',amount:item.price,categoryId:item.categoryId,date:today(),participantId:data.participants[0]?.id||'',scope:data.categories.find((c:Category)=>c.id===item.categoryId)?.scope||'shared',comment:item.name};patchData({purchases:data.purchases.map((p:Purchase)=>p.id===item.id?{...p,bought:true,transactionId:tx.id}:p),transactions:[tx,...data.transactions]});showNotice('Покупка отмечена и расход создан')}else patchData({purchases:data.purchases.map((p:Purchase)=>p.id===item.id?{...p,bought:false,transactionId:undefined}:p),transactions:item.transactionId?data.transactions.filter((t:Transaction)=>t.id!==item.transactionId):data.transactions})}
  return <><form className="inline-form" onSubmit={add}><input aria-label="Название покупки" placeholder="Что купить?" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><input aria-label="Цена" inputMode="decimal" placeholder="₽" value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/><select aria-label="Категория" value={draft.categoryId} onChange={e=>setDraft({...draft,categoryId:e.target.value})}>{data.categories.filter((c:Category)=>!c.archived).map((c:Category)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button><Icon name="plus"/></button></form>
    <section className="list-card purchase-list">{data.purchases.map((item:Purchase)=><div className={`purchase-row ${item.bought?'done':''}`} key={item.id}><button className="purchase-check" onClick={()=>toggle(item)}>{item.bought&&<Icon name="check" size={16}/>}</button><div className="grow"><b>{item.name}</b><small>{data.categories.find((c:Category)=>c.id===item.categoryId)?.name}{item.transactionId?' · связан с расходом':''}</small></div><strong>{money(item.price)}</strong><button className="bare danger-text" onClick={()=>patchData({purchases:data.purchases.filter((p:Purchase)=>p.id!==item.id)})}><Icon name="trash" size={17}/></button></div>)}{!data.purchases.length&&<Empty text="Добавьте первую покупку"/>}</section></>
}

function Goals({data,patchData}:any) {
  return <div className="goal-list">
    {data.goals.map((goal:Goal)=>{
      const pct=goal.target?goal.saved/goal.target*100:0
      const months=goal.regular>0?Math.ceil(Math.max(0,goal.target-goal.saved)/goal.regular):null
      const eta=months!==null?new Date(new Date().setMonth(new Date().getMonth()+months)):null
      const contribute=()=>patchData({goals:data.goals.map((g:Goal)=>g.id===goal.id?{...g,saved:Math.min(g.target,g.saved+g.regular)}:g)})
      return <div className="goal-card" key={goal.id}>
        <div className="goal-icon"><Icon name="target"/></div>
        <div className="goal-head"><div><small>Цель</small><h3>{goal.name}</h3></div><b>{Math.round(pct)}%</b></div>
        <div className="goal-amount"><strong>{money(goal.saved)}</strong><span>из {money(goal.target)}</span></div>
        <Progress value={pct} color={goal.color}/>
        <div className="goal-meta"><span>По {money(goal.regular)} в месяц</span><span>{eta?`≈ ${new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(eta)}`:'Без срока'}</span></div>
        <button className="secondary-button" onClick={contribute}>Внести {money(goal.regular)}</button>
      </div>
    })}
    {!data.goals.length&&<Empty text="Создайте цель накоплений"/>}
  </div>
}

function Analytics({data,categoryBudget,categorySpent}:any) {
  const cats=data.categories.filter((c:Category)=>!c.archived&&categorySpent(c.id)>0)
  const expenses=data.transactions.filter((t:Transaction)=>t.type==='expense')
  const max=Math.max(1,...cats.map((c:Category)=>Math.max(categoryBudget(c),categorySpent(c.id))))
  const byDay=expenses.reduce((acc:Record<string,number>,t:Transaction)=>({...acc,[t.date]:(acc[t.date]||0)+t.amount}),{})
  const dayEntries=Object.entries(byDay as Record<string,number>).sort().slice(-7)
  const dayMax=Math.max(1,...dayEntries.map(([,v])=>v))
  const total=expenses.reduce((s:number,t:Transaction)=>s+t.amount,0)
  const participantTotals=data.participants.map((p:Participant)=>({p,value:expenses.filter((t:Transaction)=>t.participantId===p.id).reduce((s:number,t:Transaction)=>s+t.amount,0)}))
  return <div className="analytics-grid">
    <div className="chart-card"><h3>План и факт</h3><small>По категориям, ₽</small><div className="bar-chart">{cats.slice(0,5).map((c:Category)=><div className="bar-row" key={c.id}><span>{c.emoji} {c.name}</span><div><i className="plan-bar" style={{width:`${categoryBudget(c)/max*100}%`}}/><i className="fact-bar" style={{width:`${categorySpent(c.id)/max*100}%`,background:c.color}}/></div><b>{money(categorySpent(c.id))}</b></div>)}</div><div className="legend"><span><i className="plan-key"/>План</span><span><i/>Факт</span></div></div>
    <div className="chart-card"><h3>Расходы по дням</h3><small>Последние активные дни</small><div className="column-chart">{dayEntries.map(([day,value])=><div key={day}><b style={{height:`${Math.max(8,value/dayMax*100)}%`}}/><small>{new Date(`${day}T12:00:00`).getDate()}</small></div>)}</div></div>
    <div className="chart-card"><h3>Распределение расходов</h3><div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(${cats.map((c:Category,i:number)=>`${c.color} ${cats.slice(0,i).reduce((s:number,x:Category)=>s+categorySpent(x.id),0)/Math.max(total,1)*100}% ${cats.slice(0,i+1).reduce((s:number,x:Category)=>s+categorySpent(x.id),0)/Math.max(total,1)*100}%`).join(',') || 'var(--surface-2) 0 100%'}`}}><span><b>{money(total)}</b><small>всего</small></span></div><div className="donut-legend">{cats.slice(0,4).map((c:Category)=><div key={c.id}><i style={{background:c.color}}/>{c.name}<b>{total?Math.round(categorySpent(c.id)/total*100):0}%</b></div>)}</div></div></div>
    <div className="chart-card"><h3>Вклад участников</h3>{participantTotals.map(({p,value}:any)=><div className="person-bar" key={p.id}><span style={{background:p.color}}>{p.name[0]}</span><div><b>{p.name}</b><Progress value={total?value/total*100:0} color={p.color}/></div><strong>{money(value)}</strong></div>)}</div>
    <div className="chart-card"><h3>Динамика накоплений</h3><small>Текущие цели</small><svg className="line-chart" viewBox="0 0 300 100" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9f7aea" stopOpacity=".3"/><stop offset="1" stopColor="#9f7aea" stopOpacity="0"/></linearGradient></defs><path d="M0,90 C40,85 55,72 90,74 S145,48 180,53 S230,28 300,16 L300,100 L0,100Z" fill="url(#area)"/><path d="M0,90 C40,85 55,72 90,74 S145,48 180,53 S230,28 300,16" fill="none" stroke="#9f7aea" strokeWidth="4" strokeLinecap="round"/></svg></div>
  </div>
}

function SettingsPage({data,setData,patchData,setSheet,showNotice}:any) {
  const fileRef=useRef<HTMLInputElement>(null)
  const updateSettings=(patch:any)=>patchData({settings:{...data.settings,...patch}})
  const allocationTotal=Object.values(data.settings.allocation as Record<string,number>).reduce((a,b)=>a+b,0)
  const exportJson=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`vmeste-budget-${today()}.json`;a.click();URL.revokeObjectURL(a.href);showNotice('Резервная копия скачана')}
  const importJson=(file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result));if(!parsed.categories||!parsed.transactions)throw new Error();setData(parsed);showNotice('Данные восстановлены')}catch{showNotice('Не удалось прочитать файл')}};reader.readAsText(file)}
  return <div className="page settings-page"><PageHeader eyebrow="Всё под вашим контролем" title="Настройки"/>
    <SettingsGroup title="Распределение дохода" note={allocationTotal!==100?`Сумма долей: ${allocationTotal}%. Нужно 100%.`:undefined}>
      <NumberSetting label="Личные накопления" value={data.settings.allocation.savings} suffix="%" onChange={(v)=>updateSettings({allocation:{...data.settings.allocation,savings:v}})}/>
      <NumberSetting label="Совместный бюджет" value={data.settings.allocation.shared} suffix="%" onChange={(v)=>updateSettings({allocation:{...data.settings.allocation,shared:v}})}/>
      <NumberSetting label="Личные деньги" value={data.settings.allocation.personal} suffix="%" onChange={(v)=>updateSettings({allocation:{...data.settings.allocation,personal:v}})}/>
      <ToggleRow label="Учитывать личные деньги" detail="Отдельные личные категории" checked={data.settings.personalEnabled} onChange={(v)=>updateSettings({personalEnabled:v})}/>
    </SettingsGroup>

    <SettingsGroup title="Доходы">
      {data.incomeSources.map((source:IncomeSource)=><div className="settings-item income-setting" key={source.id}><div className="settings-icon green"><Icon name="wallet"/></div><div className="grow"><input value={source.name} aria-label="Название дохода" onChange={e=>patchData({incomeSources:data.incomeSources.map((s:IncomeSource)=>s.id===source.id?{...s,name:e.target.value}:s)})}/><input className="days-input" aria-label="Дни выплат" defaultValue={source.days.join(', ')} onBlur={e=>{const days=e.target.value.split(/[,\s]+/).map(Number).filter(n=>n>=1&&n<=31);if(days.length)patchData({incomeSources:data.incomeSources.map((s:IncomeSource)=>s.id===source.id?{...s,days}:s)})}} /></div><input className="money-input" aria-label="Сумма дохода" type="number" value={source.amount} onChange={e=>patchData({incomeSources:data.incomeSources.map((s:IncomeSource)=>s.id===source.id?{...s,amount:Number(e.target.value)}:s)})}/><button className="bare danger-text" onClick={()=>patchData({incomeSources:data.incomeSources.filter((s:IncomeSource)=>s.id!==source.id)})}><Icon name="trash" size={17}/></button></div>)}
      <button className="settings-add" onClick={()=>setSheet('income')}><Icon name="plus"/>Добавить доход</button>
    </SettingsGroup>

    <SettingsGroup title="Участники">
      {data.participants.map((p:Participant)=><div className="settings-item" key={p.id}><span className="avatar" style={{background:p.color}}>{p.name[0]}</span><input className="grow" aria-label="Имя участника" value={p.name} onChange={e=>patchData({participants:data.participants.map((x:Participant)=>x.id===p.id?{...x,name:e.target.value}:x)})}/><input className="share-input" aria-label="Доля участника" type="number" value={p.share} onChange={e=>patchData({participants:data.participants.map((x:Participant)=>x.id===p.id?{...x,share:Number(e.target.value)}:x)})}/><span>%</span>{data.participants.length>1&&<button className="bare danger-text" onClick={()=>patchData({participants:data.participants.filter((x:Participant)=>x.id!==p.id)})}><Icon name="trash" size={17}/></button>}</div>)}
      <button className="settings-add" onClick={()=>setSheet('participant')}><Icon name="plus"/>Добавить участника</button>
    </SettingsGroup>

    <SettingsGroup title="Бюджетный период">
      <div className="segmented period-tabs">{([['month','Месяц'],['payday','Между выплатами'],['custom','Свои даты']] as [PeriodType,string][]).map(([id,label])=><button className={data.settings.periodType===id?'active':''} onClick={()=>updateSettings({periodType:id})} key={id}>{label}</button>)}</div>
      {data.settings.periodType==='custom'&&<div className="date-pair"><label>Начало<input type="date" value={data.settings.customStart} onChange={e=>updateSettings({customStart:e.target.value})}/></label><label>Конец<input type="date" value={data.settings.customEnd} onChange={e=>updateSettings({customEnd:e.target.value})}/></label></div>}
    </SettingsGroup>

    <SettingsGroup title="Оформление"><div className="theme-options">{(['light','dark','system'] as const).map(theme=><button key={theme} className={data.settings.theme===theme?'active':''} onClick={()=>updateSettings({theme})}><Icon name={theme==='dark'?'moon':theme==='light'?'home':'settings'}/>{theme==='light'?'Светлая':theme==='dark'?'Тёмная':'Системная'}</button>)}</div></SettingsGroup>
    <SettingsGroup title="Данные"><button className="data-button" onClick={exportJson}><span className="settings-icon"><Icon name="download"/></span><div><b>Экспортировать JSON</b><small>Скачать полную резервную копию</small></div><Icon name="chevron"/></button><button className="data-button" onClick={()=>fileRef.current?.click()}><span className="settings-icon"><Icon name="upload"/></span><div><b>Импортировать JSON</b><small>Заменит текущие данные</small></div><Icon name="chevron"/></button><input ref={fileRef} hidden type="file" accept="application/json" onChange={e=>importJson(e.target.files?.[0])}/></SettingsGroup>
    <button className="reset-button" onClick={()=>{if(confirm('Вернуть демонстрационные данные? Текущие данные будут заменены.')){setData(structuredClone(demoData));showNotice('Демоданные восстановлены')}}}>Восстановить демоданные</button>
    <p className="privacy-note">🔒 Все данные хранятся только на этом устройстве.</p>
  </div>
}

function SettingsGroup({title,note,children}:{title:string;note?:string;children:React.ReactNode}){return <section className="settings-group"><div className="settings-title"><h2>{title}</h2>{note&&<span>{note}</span>}</div><div className="settings-card">{children}</div></section>}
function NumberSetting({label,value,suffix,onChange}:{label:string;value:number;suffix:string;onChange:(v:number)=>void}){return <label className="number-setting"><span>{label}</span><span><input type="number" value={value} onChange={e=>onChange(Number(e.target.value))}/>{suffix}</span></label>}
function ToggleRow({label,detail,checked,onChange}:{label:string;detail:string;checked:boolean;onChange:(v:boolean)=>void}){return <div className="toggle-row"><div><b>{label}</b><small>{detail}</small></div><button className={`toggle ${checked?'on':''}`} onClick={()=>onChange(!checked)}><i/></button></div>}

function BottomNav({current,navigate}:{current:Page;navigate:(p:Page)=>void}) { const items:[Page,IconName,string][]=[['home','home','Главная'],['operations','list','Операции'],['add','plus','Добавить'],['plan','plan','План'],['settings','settings','Настройки']];return <nav className="bottom-nav">{items.map(([id,icon,label])=>id==='add'?<button key={id} className="nav-add" onClick={()=>navigate(id)}><span><Icon name="plus" size={27}/></span><small>{label}</small></button>:<button key={id} className={current===id?'active':''} onClick={()=>navigate(id)}><Icon name={icon}/><small>{label}</small></button>)}</nav> }

function Sheet({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode}) {return <div className="sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="sheet"><div className="sheet-handle"/><header><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose}><Icon name="close"/></button></header>{children}</section></div>}

function TransactionSheet({data,initial,onClose,onSave}:{data:BudgetData;initial:Transaction|null;onClose:()=>void;onSave:(t:Transaction)=>void}) {
  const defaultCat=data.categories.find(c=>!c.archived&&c.scope==='shared')
  const [form,setForm]=useState<Transaction>(initial||{id:uid(),type:'expense',amount:0,categoryId:defaultCat?.id,date:today(),participantId:data.participants[0]?.id||'',scope:'shared',comment:''})
  const set=(patch:Partial<Transaction>)=>setForm(f=>({...f,...patch}))
  const submit=(e:FormEvent)=>{e.preventDefault();if(form.amount<=0)return;onSave(form)}
  return <Sheet title={initial?'Редактировать операцию':'Новая операция'} subtitle="Проверьте данные перед сохранением" onClose={onClose}><form className="sheet-form" onSubmit={submit}>
    <div className="segmented type-toggle"><button type="button" className={form.type==='expense'?'active':''} onClick={()=>set({type:'expense'})}>Расход</button><button type="button" className={form.type==='income'?'active':''} onClick={()=>set({type:'income',categoryId:undefined})}>Доход</button></div>
    <label className="amount-field"><span>Сумма</span><div><input autoFocus inputMode="decimal" type="number" min="0" step="0.01" value={form.amount||''} placeholder="0" onChange={e=>set({amount:Number(e.target.value)})}/><b>₽</b></div></label>
    {form.type==='expense'&&<label><span>Категория</span><select value={form.categoryId} onChange={e=>{const cat=data.categories.find(c=>c.id===e.target.value);set({categoryId:e.target.value,scope:cat?.scope||'shared'})}}>{data.categories.filter(c=>!c.archived&&(data.settings.personalEnabled||c.scope==='shared')).map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></label>}
    <div className="form-grid"><label><span>Дата</span><input type="date" value={form.date} onChange={e=>set({date:e.target.value})}/></label><label><span>Кто оплатил</span><select value={form.participantId} onChange={e=>set({participantId:e.target.value})}>{data.participants.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
    <label><span>Бюджет</span><div className="segmented mini"><button type="button" className={form.scope==='shared'?'active':''} onClick={()=>set({scope:'shared'})}>Общий</button><button type="button" disabled={!data.settings.personalEnabled} className={form.scope==='personal'?'active':''} onClick={()=>set({scope:'personal'})}>Личный</button></div></label>
    <label><span>Комментарий</span><textarea rows={2} placeholder="Например, продукты на неделю" value={form.comment} onChange={e=>set({comment:e.target.value})}/></label>
    <button className="primary-button" disabled={form.amount<=0}>{initial?'Сохранить изменения':'Добавить операцию'}</button>
  </form></Sheet>
}

function VoiceSheet({data,onClose,onConfirm}:{data:BudgetData;onClose:()=>void;onConfirm:(t:Transaction)=>void}) {
  const [text,setText]=useState('');const [listening,setListening]=useState(false);const supported='webkitSpeechRecognition' in window||'SpeechRecognition' in window
  const parse=(raw:string)=>{const amount=Number(raw.match(/\d[\d\s]*(?:[.,]\d+)?/)?.[0].replace(/\s/g,'').replace(',','.')||0);const low=raw.toLowerCase();const cat=data.categories.find(c=>low.includes(c.name.toLowerCase())||low.includes(c.name.toLowerCase().split(' ')[0]));return {id:uid(),type:'expense' as const,amount,categoryId:cat?.id||data.categories[0]?.id,date:today(),participantId:data.participants[0]?.id||'',scope:cat?.scope||'shared',comment:raw}}
  const listen=()=>{if(!supported)return;const W=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;const rec=new W();rec.lang='ru-RU';rec.interimResults=false;setListening(true);rec.onresult=(e:any)=>{setText(e.results[0][0].transcript);setListening(false)};rec.onerror=()=>setListening(false);rec.onend=()=>setListening(false);rec.start()}
  return <Sheet title="Голосовой ввод" subtitle="Например: «Добавь 1500 рублей на продукты»" onClose={onClose}><div className="voice-sheet"><button className={`voice-orb ${listening?'listening':''}`} onClick={listen}><Icon name="mic" size={32}/></button><p>{listening?'Слушаю…':supported?'Нажмите и произнесите команду':'Распознавание речи не поддерживается. Введите команду ниже.'}</p><input value={text} placeholder="Добавь 1500 рублей на продукты" onChange={e=>setText(e.target.value)}/><button className="primary-button" disabled={!text} onClick={()=>onConfirm(parse(text))}>Проверить и продолжить</button><small>Перед сохранением откроется заполненная форма подтверждения.</small></div></Sheet>
}

function CategorySheet({data,onClose,onSave}:{data:BudgetData;onClose:()=>void;onSave:(c:Category)=>void}) {
 const [form,setForm]=useState<Category>({id:uid(),name:'',emoji:'🧩',color:'#5b7cfa',scope:'shared',mode:'percent',value:0,rollover:'reset'});const set=(p:Partial<Category>)=>setForm(f=>({...f,...p}));return <Sheet title="Новая категория" onClose={onClose}><form className="sheet-form" onSubmit={e=>{e.preventDefault();if(form.name)onSave(form)}}><div className="form-grid narrow"><label><span>Значок</span><input value={form.emoji} onChange={e=>set({emoji:e.target.value})}/></label><label><span>Цвет</span><input type="color" value={form.color} onChange={e=>set({color:e.target.value})}/></label></div><label><span>Название</span><input autoFocus required value={form.name} onChange={e=>set({name:e.target.value})}/></label><label><span>Бюджет</span><div className="segmented mini"><button type="button" className={form.scope==='shared'?'active':''} onClick={()=>set({scope:'shared'})}>Общий</button><button type="button" className={form.scope==='personal'?'active':''} onClick={()=>set({scope:'personal'})}>Личный</button></div></label><label><span>Способ расчёта</span><div className="segmented mini"><button type="button" className={form.mode==='percent'?'active':''} onClick={()=>set({mode:'percent'})}>Процент</button><button type="button" className={form.mode==='fixed'?'active':''} onClick={()=>set({mode:'fixed'})}>Сумма</button></div></label><label><span>{form.mode==='percent'?'Доля, %':'Лимит, ₽'}</span><input type="number" min="0" value={form.value||''} onChange={e=>set({value:Number(e.target.value)})}/></label><label><span>Остаток в конце периода</span><select value={form.rollover} onChange={e=>set({rollover:e.target.value as Category['rollover']})}><option value="reset">Обнулить</option><option value="carry">Перенести дальше</option><option value="savings">Перевести в накопления</option></select></label><button className="primary-button">Создать категорию</button></form></Sheet>
}

function ParticipantSheet({onClose,onSave}:{onClose:()=>void;onSave:(p:Participant)=>void}) {const [name,setName]=useState('');const [share,setShare]=useState(0);return <Sheet title="Новый участник" onClose={onClose}><form className="sheet-form" onSubmit={e=>{e.preventDefault();if(name)onSave({id:uid(),name,share,color:'#50b99b'})}}><label><span>Имя</span><input autoFocus required value={name} onChange={e=>setName(e.target.value)}/></label><label><span>Доля личных денег, %</span><input type="number" min="0" max="100" value={share} onChange={e=>setShare(Number(e.target.value))}/></label><button className="primary-button">Добавить участника</button></form></Sheet>}
function IncomeSheet({onClose,onSave}:{onClose:()=>void;onSave:(p:IncomeSource)=>void}) {const [name,setName]=useState('');const [amount,setAmount]=useState(0);const [days,setDays]=useState('5, 20');return <Sheet title="Новый источник дохода" onClose={onClose}><form className="sheet-form" onSubmit={e=>{e.preventDefault();if(name&&amount)onSave({id:uid(),name,amount,days:days.split(/[,\s]+/).map(Number).filter(n=>n>=1&&n<=31),enabled:true})}}><label><span>Название</span><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="Зарплата, фриланс…"/></label><label><span>Сумма за месяц, ₽</span><input type="number" min="0" value={amount||''} onChange={e=>setAmount(Number(e.target.value))}/></label><label><span>Дни выплат через запятую</span><input value={days} onChange={e=>setDays(e.target.value)} placeholder="5, 20"/></label><button className="primary-button">Добавить доход</button></form></Sheet>}
function GoalSheet({onClose,onSave}:{onClose:()=>void;onSave:(g:Goal)=>void}) {const [form,setForm]=useState({name:'',target:0,saved:0,regular:0});return <Sheet title="Новая цель" onClose={onClose}><form className="sheet-form" onSubmit={e=>{e.preventDefault();if(form.name&&form.target)onSave({id:uid(),...form,color:'#9f7aea'})}}><label><span>Название</span><input autoFocus required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span>Целевая сумма, ₽</span><input type="number" value={form.target||''} onChange={e=>setForm({...form,target:Number(e.target.value)})}/></label><div className="form-grid"><label><span>Уже накоплено</span><input type="number" value={form.saved||''} onChange={e=>setForm({...form,saved:Number(e.target.value)})}/></label><label><span>Взнос в месяц</span><input type="number" value={form.regular||''} onChange={e=>setForm({...form,regular:Number(e.target.value)})}/></label></div><button className="primary-button">Создать цель</button></form></Sheet>}

function TransferSheet({data,onClose,onSave}:{data:BudgetData;onClose:()=>void;onSave:(t:any)=>void}) {const cats=data.categories.filter(c=>!c.archived);const [from,setFrom]=useState(cats[0]?.id||'');const [to,setTo]=useState(cats[1]?.id||'');const [amount,setAmount]=useState(0);return <Sheet title="Перевод между категориями" subtitle="Лимит одной категории уменьшится, другой — увеличится" onClose={onClose}><form className="sheet-form" onSubmit={e=>{e.preventDefault();if(amount>0&&from!==to)onSave({id:uid(),fromCategoryId:from,toCategoryId:to,amount,date:today()})}}><label><span>Из категории</span><select value={from} onChange={e=>setFrom(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></label><label><span>В категорию</span><select value={to} onChange={e=>setTo(e.target.value)}>{cats.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></label><label><span>Сумма, ₽</span><input autoFocus type="number" min="0" value={amount||''} onChange={e=>setAmount(Number(e.target.value))}/></label><button className="primary-button" disabled={from===to||amount<=0}>Перевести</button></form></Sheet>}

function CategoryDetail({data,categoryId,periodTransactions,categoryBudget,categorySpent,categoryLeft,onClose,onUpdate,onDelete}:any) {
  const source=data.categories.find((c:Category)=>c.id===categoryId)
  const [cat,setCat]=useState<Category|undefined>(source)
  const [editing,setEditing]=useState(false)
  if(!source||!cat)return null
  const set=(patch:Partial<Category>)=>setCat(c=>c?({...c,...patch}):c)
  const tx=periodTransactions.filter((t:Transaction)=>t.categoryId===cat.id)
  const budget=categoryBudget(cat),spent=categorySpent(cat.id),left=categoryLeft(cat)
  const rule=cat.rollover==='carry'?'Перенести дальше':cat.rollover==='savings'?'В накопления':'Обнулить'
  return <Sheet title={`${cat.emoji} ${cat.name}`} subtitle={`Остаток периода: ${money(left)}`} onClose={onClose}>
    <div className="category-detail">
      <div className="budget-numbers big"><span><small>Лимит</small><b>{money(budget)}</b></span><span><small>Потрачено</small><b>{money(spent)}</b></span><span><small>Остаток</small><b className={left<0?'negative':''}>{money(left)}</b></span></div>
      <Progress value={budget?spent/budget*100:0} color={left<0?'var(--red)':cat.color}/>
      {!editing&&<><div className="rule-row"><span>Правило остатка</span><b>{rule}</b></div><button className="edit-category-button" onClick={()=>setEditing(true)}><Icon name="edit" size={17}/>Изменить категорию</button></>}
      {editing&&<form className="sheet-form category-edit" onSubmit={e=>{e.preventDefault();onUpdate(cat);setEditing(false)}}>
        <div className="form-grid narrow"><label><span>Значок</span><input value={cat.emoji} onChange={e=>set({emoji:e.target.value})}/></label><label><span>Цвет</span><input type="color" value={cat.color} onChange={e=>set({color:e.target.value})}/></label></div>
        <label><span>Название</span><input required value={cat.name} onChange={e=>set({name:e.target.value})}/></label>
        <label><span>Бюджет</span><div className="segmented mini"><button type="button" className={cat.scope==='shared'?'active':''} onClick={()=>set({scope:'shared'})}>Общий</button><button type="button" className={cat.scope==='personal'?'active':''} onClick={()=>set({scope:'personal'})}>Личный</button></div></label>
        <label><span>Лимит</span><div className="limit-edit"><select value={cat.mode} onChange={e=>set({mode:e.target.value as Category['mode']})}><option value="percent">Процент, %</option><option value="fixed">Сумма, ₽</option></select><input type="number" min="0" value={cat.value} onChange={e=>set({value:Number(e.target.value)})}/></div></label>
        <label><span>Правило остатка</span><select value={cat.rollover} onChange={e=>set({rollover:e.target.value as Category['rollover']})}><option value="reset">Обнулить</option><option value="carry">Перенести дальше</option><option value="savings">Перевести в накопления</option></select></label>
        <button className="primary-button">Сохранить</button>
        <button type="button" className="delete-category-button" onClick={()=>{if(confirm(`Удалить категорию «${cat.name}»?`))onDelete(cat.id)}}><Icon name="trash" size={16}/>Удалить категорию</button>
      </form>}
      {!editing&&<><h3>{left<0?'Операции, создавшие минус':'Операции категории'}</h3><div className="list-card transaction-list">{tx.map((t:Transaction)=><TransactionRow key={t.id} transaction={t} data={data}/>)}{!tx.length&&<Empty text="Расходов в этом периоде нет"/>}</div></>}
    </div>
  </Sheet>
}

export default App
