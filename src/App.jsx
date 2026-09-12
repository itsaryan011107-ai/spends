import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Home,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'

const today = new Date()
const isoToday = today.toISOString().slice(0, 10)
const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Education', 'Bills', 'Other']
const seedData = {
  allowances: [
    { id: 'a1', amount: 5000, date: '2026-09-01', note: 'Dad', createdAt: '2026-09-01T08:00:00' },
    { id: 'a2', amount: 2000, date: '2026-09-06', note: 'Pocket money', createdAt: '2026-09-06T08:00:00' },
  ],
  expenses: [
    { id: 'e1', amount: 280, merchant: 'SATYAM GOUR', date: '2026-09-10', time: '14:09', category: 'Food', transactionId: 'FMPIB6149001858', utr: '619442650013', source: 'email', createdAt: '2026-09-10T14:09:00' },
    { id: 'e2', amount: 120, merchant: 'Metro Card', date: '2026-09-09', time: '09:30', category: 'Transport', source: 'manual', createdAt: '2026-09-09T09:30:00' },
    { id: 'e3', amount: 650, merchant: 'Myntra', date: '2026-09-07', time: '19:12', category: 'Shopping', source: 'manual', createdAt: '2026-09-07T19:12:00' },
    { id: 'e4', amount: 90, merchant: 'Chai Point', date: '2026-09-04', time: '17:20', category: 'Food', source: 'manual', createdAt: '2026-09-04T17:20:00' },
  ],
}

const money = (value) => `${value < 0 ? '-' : ''}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`
const shortMoney = (value) => `${value < 0 ? '-' : ''}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`
const formatDate = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
const formatMonthDay = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`))
const formatTime = (time) => time ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2026-01-01T${time}`)) : ''
const daysBetween = (from, to = isoToday) => Math.max(1, Math.floor((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1)
const toDisplayDate = (date) => date ? date.split('-').reverse().join('/') : ''
const toIsoDate = (date) => { const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return match ? `${match[3]}-${match[2]}-${match[1]}` : '' }

function loadData() {
  try {
    const saved = localStorage.getItem('fincheck-data')
    return saved ? JSON.parse(saved) : seedData
  } catch {
    return seedData
  }
}

function App() {
  const [data, setData] = useState(loadData)
  const [activeView, setActiveView] = useState('dashboard')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem('fincheck-theme') === 'dark')
  const [toast, setToast] = useState(null)
  const [simulatedDate, setSimulatedDate] = useState(() => localStorage.getItem('fincheck-simulated-date') || isoToday)

  const metrics = useMemo(() => {
    const expenses = data.expenses.filter((item) => item.date <= simulatedDate)
    const allowances = data.allowances.filter((item) => item.date <= simulatedDate)
    const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
    const totalReceived = allowances.reduce((sum, item) => sum + Number(item.amount), 0)
    const balance = totalReceived - totalSpent
    const allDates = [...expenses.map((item) => item.date), ...allowances.map((item) => item.date)].sort()
    const firstDate = allDates[0] || isoToday
    const trackingDays = daysBetween(firstDate, simulatedDate)
    const latestAllowance = [...allowances].sort((a, b) => b.date.localeCompare(a.date))[0]
    const cycleStart = latestAllowance?.date || firstDate
    const cycleSpent = expenses.filter((item) => item.date >= cycleStart).reduce((sum, item) => sum + Number(item.amount), 0)
    const cycleDays = daysBetween(cycleStart, simulatedDate)
    const availableDays = Math.min(7, trackingDays)
    const rollingStart = new Date(`${simulatedDate}T00:00:00`)
    rollingStart.setDate(rollingStart.getDate() - availableDays + 1)
    const rollingStartIso = rollingStart.toISOString().slice(0, 10)
    const rollingSpent = expenses.filter((item) => item.date >= rollingStartIso).reduce((sum, item) => sum + Number(item.amount), 0)
    const rollingAverage = rollingSpent / availableDays
    const cycleAverage = cycleSpent / cycleDays
    const lifetimeAverage = totalSpent / trackingDays
    const forecastRate = rollingAverage || cycleAverage || lifetimeAverage
    const runway = forecastRate > 0 && balance > 0 ? balance / forecastRate : null
    const runout = runway ? new Date(new Date(`${simulatedDate}T00:00:00`).getTime() + runway * 86400000) : null
    return { totalSpent, totalReceived, balance, latestAllowance, cycleSpent, cycleDays, cycleAverage, lifetimeAverage, rollingAverage, runway, runout, trackingDays, forecastRate }
  }, [data, simulatedDate])

  const persist = (next) => {
    setData(next)
    localStorage.setItem('fincheck-data', JSON.stringify(next))
  }

  const submitExpense = (form) => {
    const expense = { ...form, id: crypto.randomUUID(), amount: Number(form.amount), source: 'manual', createdAt: `${form.date}T${form.time}:00` }
    persist({ ...data, expenses: [expense, ...data.expenses] })
    setModal(null)
    setToast(`${money(expense.amount)} spent at ${expense.merchant || 'Unlisted merchant'}`)
    setTimeout(() => setToast(null), 4000)
  }

  const submitAllowance = (form) => {
    const allowance = { ...form, id: crypto.randomUUID(), amount: Number(form.amount), createdAt: `${form.date}T08:00:00` }
    persist({ ...data, allowances: [allowance, ...data.allowances] })
    setModal(null)
    setToast(`${money(allowance.amount)} added to your balance`)
    setTimeout(() => setToast(null), 4000)
  }

  const deleteExpense = (id) => {
    persist({ ...data, expenses: data.expenses.filter((item) => item.id !== id) })
    setSelected(null)
  }

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('fincheck-theme', next ? 'dark' : 'light')
  }

  const updateSimulatedDate = (nextDate) => {
    setSimulatedDate(nextDate)
    localStorage.setItem('fincheck-simulated-date', nextDate)
  }

  const shiftSimulatedDate = (days) => {
    const nextDate = new Date(`${simulatedDate}T00:00:00`)
    nextDate.setDate(nextDate.getDate() + days)
    updateSimulatedDate(nextDate.toISOString().slice(0, 10))
  }

  const resetLedger = () => persist({ allowances: [], expenses: [] })
  const clearExpenses = () => persist({ ...data, expenses: [] })
  const setTestBalance = (target) => {
    const desired = Number(target)
    if (!Number.isFinite(desired) || desired < 0) return
    const difference = desired - metrics.balance
    if (difference === 0) return
    if (difference > 0) {
      submitAllowance({ amount: difference, date: simulatedDate, note: 'Developer balance adjustment' })
    } else {
      submitExpense({ amount: Math.abs(difference), date: simulatedDate, time: '12:00', category: 'Other' })
    }
  }

  const activity = [...data.expenses.map((item) => ({ ...item, kind: 'expense' })), ...data.allowances.map((item) => ({ ...item, kind: 'allowance' }))].sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`))

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Wallet size={18} /></span><span>FinCheck</span></div>
        <div className="profile"><div className="avatar">A</div><div><strong>Arjun</strong><span>Personal account</span></div><ChevronRight size={15} /></div>
        <nav>
          <NavButton icon={<Home size={18} />} label="Overview" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <NavButton icon={<CreditCard size={18} />} label="Transactions" active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} badge={activity.length} />
          <NavButton icon={<BarChart3 size={18} />} label="Insights" active={activeView === 'insights'} onClick={() => setActiveView('insights')} />
          <NavButton className="mobile-settings" icon={<Settings size={18} />} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </nav>
        <div className="sidebar-bottom">
          <button className="theme-switch" onClick={toggleTheme}><span>{dark ? <Moon size={17} /> : <Sun size={17} />}</span>{dark ? 'Dark mode' : 'Light mode'}<span className={dark ? 'toggle on' : 'toggle'}><i /></span></button>
          <div className="version">FINCHECK V1.0 <span>•</span> LOCAL MODE</div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div><p className="eyebrow">{new Date(`${simulatedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{simulatedDate !== isoToday && ' · SIMULATED'}</p><h1>{activeView === 'dashboard' ? 'Your money, at a glance.' : activeView === 'transactions' ? 'Your activity.' : activeView === 'insights' ? 'Your spending patterns.' : 'Preferences.'}</h1></div><div className="top-actions"><button className="icon-button" title="Settings" onClick={() => setActiveView('settings')}><Settings size={18} /></button><button className="icon-button" title="Help"><CircleHelp size={19} /></button><div className="online"><span /> Local data only</div></div></header>
        {activeView === 'dashboard' && <Dashboard metrics={metrics} activity={activity} onAddExpense={() => setModal('expense')} onAddAllowance={() => setModal('allowance')} onSelect={setSelected} />}
        {activeView === 'transactions' && <Transactions activity={activity} onAddExpense={() => setModal('expense')} onAddAllowance={() => setModal('allowance')} onSelect={setSelected} />}
        {activeView === 'insights' && <Insights metrics={metrics} expenses={data.expenses} simulatedDate={simulatedDate} />}
        {activeView === 'settings' && <SettingsView dark={dark} onToggleTheme={toggleTheme} data={data} metrics={metrics} simulatedDate={simulatedDate} onDateChange={updateSimulatedDate} onShiftDate={shiftSimulatedDate} onResetLedger={resetLedger} onClearExpenses={clearExpenses} onSetBalance={setTestBalance} />}
      </main>
      {modal === 'expense' && <ExpenseModal currentDate={simulatedDate} onClose={() => setModal(null)} onSubmit={submitExpense} />}
      {modal === 'allowance' && <AllowanceModal currentDate={simulatedDate} onClose={() => setModal(null)} onSubmit={submitAllowance} />}
      {selected && <DetailsModal item={selected} onClose={() => setSelected(null)} onDelete={selected.kind === 'expense' && selected.source === 'manual' ? () => deleteExpense(selected.id) : null} />}
      {toast && <div className="toast"><span className="toast-icon"><Check size={16} /></span><div><strong>{toast}</strong><small>Balance updated from your ledger</small></div><button onClick={() => setToast(null)}><X size={16} /></button></div>}
    </div>
  )
}

function NavButton({ icon, label, active, onClick, badge, className = '' }) { return <button className={`${active ? 'nav-button active' : 'nav-button'} ${className}`} onClick={onClick}>{icon}<span>{label}</span>{badge && <b>{badge}</b>}</button> }

function Dashboard({ metrics, activity, onAddExpense, onAddAllowance, onSelect }) {
  return <div className="content dashboard-content">
    <section className="hero-grid">
      <div className="balance-card"><div className="card-label light-label"><span className="status-dot" /> CURRENT BALANCE</div><div className="balance-value">{money(metrics.balance)}</div><p className="balance-caption">Calculated from your allowances and expenses</p><div className="balance-footer"><span><ArrowDownLeft size={15} /> {money(metrics.totalReceived)} received</span><span><ArrowUpRight size={15} /> {money(metrics.totalSpent)} spent</span></div></div>
      <div className="runway-card"><div className="card-heading"><div><div className="card-label">YOUR RUNWAY</div><h2>{metrics.runway ? `${Math.round(metrics.runway)} days` : 'Not enough data'}</h2></div><div className="runway-icon"><Clock3 size={20} /></div></div><p>{metrics.runway ? `At your recent pace, your money should last until ${metrics.runout.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.` : 'Add a few expenses to unlock your spending forecast.'}</p><div className="runway-bar"><span style={{ width: `${Math.min(100, Math.max(12, (metrics.balance / Math.max(metrics.latestAllowance?.amount || metrics.balance, 1)) * 100))}%` }} /></div><div className="runway-meta"><span>7-day pace <strong>{money(metrics.rollingAverage)}/day</strong></span><span>{metrics.runout ? metrics.runout.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span></div></div>
    </section>
    <section className="metric-grid"><Metric label="7-day average" value={`${money(metrics.rollingAverage)}/day`} detail="Your recent pace" accent="green" /><Metric label="This cycle" value={money(metrics.cycleSpent)} detail={`${money(metrics.cycleAverage)}/day average`} /><Metric label="Lifetime average" value={`${money(metrics.lifetimeAverage)}/day`} detail={`${metrics.trackingDays} days tracked`} /><Metric label="Total spent" value={money(metrics.totalSpent)} detail={`${metrics.totalReceived ? Math.round(metrics.totalSpent / metrics.totalReceived * 100) : 0}% of money received`} /></section>
    <section className="lower-grid"><div className="panel activity-panel"><div className="panel-head"><div><div className="card-label">RECENT ACTIVITY</div><h2>Latest movements</h2></div><button className="text-button" onClick={() => document.querySelector('.nav-button:nth-child(2)')?.click()}>View all <ChevronRight size={15} /></button></div>{activity.slice(0, 5).map((item) => <ActivityRow key={`${item.kind}-${item.id}`} item={item} onClick={() => onSelect(item)} />)}</div><div className="panel cycle-panel"><div className="card-label">CURRENT ALLOWANCE</div><h2>{metrics.latestAllowance ? money(metrics.latestAllowance.amount) : '—'}</h2><p>{metrics.latestAllowance ? `Received ${formatMonthDay(metrics.latestAllowance.date)}${metrics.latestAllowance.note ? ` · ${metrics.latestAllowance.note}` : ''}` : 'Add an allowance to start your ledger.'}</p><div className="cycle-stat"><span>Spent this cycle</span><strong>{money(metrics.cycleSpent)}</strong></div><div className="cycle-stat"><span>Cycle pace</span><strong>{money(metrics.cycleAverage)}<small>/day</small></strong></div><button className="outline-button full" onClick={onAddAllowance}><Plus size={16} /> Add allowance</button></div></section>
    <div className="quick-actions"><button className="primary-button" onClick={onAddExpense}><Plus size={17} /> Add expense</button><button className="secondary-button" onClick={onAddAllowance}><ArrowDownLeft size={17} /> Add allowance</button><span className="quick-hint">Your balance is always calculated from this ledger.</span></div>
  </div>
}

function Metric({ label, value, detail, accent }) { return <div className="metric"><span className="metric-label">{label}</span><strong className={accent === 'green' ? 'green-text' : ''}>{value}</strong><small>{detail}</small></div> }
function ActivityRow({ item, onClick }) { const allowance = item.kind === 'allowance'; return <button className="activity-row" onClick={onClick}><span className={allowance ? 'activity-icon allowance' : 'activity-icon expense'}>{allowance ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="activity-main"><strong>{allowance ? (item.note || 'Allowance') : (item.merchant || 'Expense')}</strong><small>{formatMonthDay(item.date)}{item.time ? ` · ${formatTime(item.time)}` : ''} · {allowance ? 'Money in' : `${item.category || 'Other'} · ${item.source === 'email' ? 'Imported' : 'Manual'}`}</small></span><strong className={allowance ? 'amount positive' : 'amount'}>{allowance ? '+' : '-'}{shortMoney(item.amount)}</strong><ChevronRight size={16} className="row-chevron" /></button> }

function Transactions({ activity, onAddExpense, onAddAllowance, onSelect }) { const [filter, setFilter] = useState('all'); const filtered = filter === 'all' ? activity : activity.filter((item) => item.kind === filter); return <div className="content"><div className="view-toolbar"><div><div className="card-label">LEDGER</div><h2>All activity <span className="count-pill">{activity.length}</span></h2></div><div className="toolbar-actions"><button className="secondary-button" onClick={onAddAllowance}><ArrowDownLeft size={16} /> Allowance</button><button className="primary-button" onClick={onAddExpense}><Plus size={16} /> Expense</button></div></div><div className="filter-row"><div className="segmented"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'expense' ? 'selected' : ''} onClick={() => setFilter('expense')}>Expenses</button><button className={filter === 'allowance' ? 'selected' : ''} onClick={() => setFilter('allowance')}>Allowances</button></div><div className="search-box"><Search size={16} /><input placeholder="Search activity" /></div></div><div className="table-panel"><div className="table-header"><span>ACTIVITY</span><span>DATE</span><span>SOURCE</span><span>AMOUNT</span><span /></div>{filtered.map((item) => <button className="table-row" key={`${item.kind}-${item.id}`} onClick={() => onSelect(item)}><span className="table-activity"><span className={item.kind === 'allowance' ? 'activity-icon allowance' : 'activity-icon expense'}>{item.kind === 'allowance' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span><strong>{item.kind === 'allowance' ? item.note || 'Allowance' : item.merchant || 'Expense'}</strong><small>{item.kind === 'allowance' ? 'Money received' : item.category || 'Other'}</small></span></span><span>{formatDate(item.date)}{item.time && <small>{formatTime(item.time)}</small>}</span><span className="source-tag">{item.kind === 'allowance' ? 'Manual' : item.source === 'email' ? 'FamPay email' : 'Manual'}</span><strong className={item.kind === 'allowance' ? 'positive' : ''}>{item.kind === 'allowance' ? '+' : '-'}{shortMoney(item.amount)}</strong><ChevronRight size={16} /></button>)}</div></div> }

function Insights({ metrics, expenses, simulatedDate }) { const max = Math.max(...Array.from({ length: 7 }, (_, index) => { const date = new Date(`${simulatedDate}T00:00:00`); date.setDate(date.getDate() - index); const dateIso = date.toISOString().slice(0, 10); return expenses.filter((item) => item.date === dateIso).reduce((sum, item) => sum + item.amount, 0) }), 1); return <div className="content"><div className="view-toolbar"><div><div className="card-label">INSIGHTS</div><h2>Make your money last.</h2></div></div><section className="insight-grid"><div className="panel insight-main"><div className="panel-head"><div><div className="card-label">LAST 7 DAYS</div><h2>Spending rhythm</h2></div><span className="trend-chip"><BarChart3 size={15} /> {money(metrics.rollingAverage)}/day</span></div><div className="bar-chart">{Array.from({ length: 7 }, (_, index) => { const date = new Date(`${simulatedDate}T00:00:00`); date.setDate(date.getDate() - (6 - index)); const dateIso = date.toISOString().slice(0, 10); const amount = expenses.filter((item) => item.date === dateIso).reduce((sum, item) => sum + item.amount, 0); return <div className="bar-column" key={dateIso}><span className="bar-value">{amount ? shortMoney(amount) : ''}</span><div className="bar-track"><i style={{ height: `${Math.max(5, amount / max * 100)}%` }} /></div><small>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</small></div> })}</div></div><div className="panel velocity-panel"><div className="card-label">SPENDING VELOCITY</div><h2>{metrics.rollingAverage < metrics.cycleAverage ? 'Cooling down' : metrics.rollingAverage > metrics.cycleAverage ? 'Picking up' : 'Holding steady'}</h2><p>Compared with your current allowance-cycle pace.</p><div className="velocity-line"><span style={{ width: `${Math.min(100, metrics.cycleAverage ? metrics.rollingAverage / metrics.cycleAverage * 50 : 50)}%` }} /></div><div className="velocity-values"><span>Recent <strong>{money(metrics.rollingAverage)}/d</strong></span><span>Cycle <strong>{money(metrics.cycleAverage)}/d</strong></span></div></div></section><section className="panel principles"><div className="card-label">HOW FINCHECK THINKS</div><div className="principle-list"><div><span>01</span><strong>Your balance is yours</strong><p>Only allowances and expenses you log change it. Reported payment-provider balances are never used.</p></div><div><span>02</span><strong>Recent behavior matters</strong><p>Your forecast uses the latest 7 days first, with sensible fallbacks when history is short.</p></div><div><span>03</span><strong>No monthly reset</strong><p>Allowance cycles begin whenever money arrives. Your lifetime history stays intact.</p></div></div></section></div> }

function SettingsView({ dark, onToggleTheme, data, metrics, simulatedDate, onDateChange, onShiftDate, onResetLedger, onClearExpenses, onSetBalance }) { const [targetBalance, setTargetBalance] = useState(metrics.balance); return <div className="content settings-content"><div className="view-toolbar"><div><div className="card-label">SETTINGS</div><h2>Keep it personal.</h2></div></div><div className="settings-panel"><div className="setting-row"><span className="setting-icon"><Sun size={18} /></span><span><strong>Appearance</strong><small>Choose the look that feels right</small></span><button className="setting-control" onClick={onToggleTheme}>{dark ? 'Dark mode' : 'Light mode'} <Sun size={15} /></button></div><div className="setting-row"><span className="setting-icon"><CreditCard size={18} /></span><span><strong>Email connection</strong><small>FamPay email import will be available here</small></span><span className="coming-soon">Coming soon</span></div><div className="setting-row"><span className="setting-icon"><CircleHelp size={18} /></span><span><strong>Notifications</strong><small>In-app notifications are enabled</small></span><span className="switch on"><i /></span></div></div><div className="dev-panel"><div className="dev-heading"><div><div className="card-label">DEVELOPER TOOLS</div><h2>Test your ledger</h2></div><span className="dev-badge">LOCAL ONLY</span></div><p className="dev-intro">Use simulated dates and quick ledger actions to test multiple spending days. These controls write to the same local data as normal entries.</p><div className="dev-section"><div><strong>Simulated date</strong><small>New expense and allowance forms use this date.</small></div><div className="date-controls"><input type="date" value={simulatedDate} onChange={(event) => onDateChange(event.target.value)} /><button className="setting-control" onClick={() => onShiftDate(-1)}>− 1 day</button><button className="setting-control" onClick={() => onShiftDate(1)}>+ 1 day</button></div></div><div className="dev-section"><div><strong>Balance target</strong><small>Creates a ledger adjustment to reach the chosen balance.</small></div><div className="balance-control"><span>₹</span><input type="number" min="0" value={targetBalance} onChange={(event) => setTargetBalance(event.target.value)} /><button className="setting-control" onClick={() => onSetBalance(targetBalance)}>Set balance</button></div></div><div className="dev-section danger-section"><div><strong>Clear test data</strong><small>{data.expenses.length} expenses · {data.allowances.length} allowances currently stored</small></div><div className="dev-actions"><button className="danger-button" onClick={onClearExpenses}><Trash2 size={15} /> Clear expenses</button><button className="danger-button solid" onClick={onResetLedger}><Trash2 size={15} /> Reset ledger</button></div></div></div><div className="explainer-grid"><div><strong>What is a cycle?</strong><p>A cycle starts on the date of your latest allowance. It measures spending since that allowance and does not erase lifetime history.</p></div><div><strong>What is local mode?</strong><p>Your data is stored only in this browser on this device. Nothing is synced or sent to a server yet.</p></div><div><strong>How do metrics handle old dates?</strong><p>Each expense uses its entered date and time. Gaps between transactions count as zero-spending days, even across months.</p></div></div><div className="privacy-note"><strong>Your data stays in this browser.</strong><p>FinCheck V1 uses local storage while the database and secure email authorization layer are being built.</p></div></div> }

function Modal({ title, eyebrow, children, onClose }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="card-label">{eyebrow}</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>{children}</div></div> }
function DateInput({ value, onChange }) { const [display, setDisplay] = useState(toDisplayDate(value)); const update = (nextValue) => { setDisplay(nextValue); const isoValue = toIsoDate(nextValue); if (isoValue) onChange(isoValue) }; return <input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={display} onChange={(event) => update(event.target.value)} required /> }
function ExpenseModal({ currentDate, onClose, onSubmit }) { const [form, setForm] = useState({ amount: '', date: currentDate, time: new Date().toTimeString().slice(0, 5), category: 'Other' }); const update = (key, value) => setForm({ ...form, [key]: value }); return <Modal title="Add an expense" eyebrow="MONEY OUT" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (form.amount && form.date) onSubmit(form) }}><div className="amount-input"><span>₹</span><input autoFocus type="number" min="1" placeholder="0" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></div><div className="form-grid"><label>Date<DateInput value={form.date} onChange={(value) => update('date', value)} /></label><label>Time<input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} required /></label><label>Category<select value={form.category} onChange={(e) => update('category', e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div><button className="primary-button submit-button" type="submit"><Plus size={17} /> Add expense</button></form></Modal> }
function AllowanceModal({ currentDate, onClose, onSubmit }) { const [form, setForm] = useState({ amount: '', date: currentDate, note: '' }); const update = (key, value) => setForm({ ...form, [key]: value }); return <Modal title="Add an allowance" eyebrow="MONEY IN" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (form.amount && form.date) onSubmit(form) }}><div className="amount-input"><span>₹</span><input autoFocus type="number" min="1" placeholder="0" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></div><div className="form-grid single"><label>Date<DateInput value={form.date} onChange={(value) => update('date', value)} /></label><label>Note <span>optional</span><input value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="e.g. Dad, scholarship" /></label></div><button className="primary-button submit-button" type="submit"><ArrowDownLeft size={17} /> Add allowance</button></form></Modal> }
function DetailsModal({ item, onClose, onDelete }) { const allowance = item.kind === 'allowance'; return <Modal title={allowance ? 'Allowance details' : 'Expense details'} eyebrow={allowance ? 'MONEY IN' : 'MONEY OUT'} onClose={onClose}><div className="detail-amount"><span className={allowance ? 'activity-icon allowance' : 'activity-icon expense'}>{allowance ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span><strong className={allowance ? 'positive' : ''}>{allowance ? '+' : '-'}{money(item.amount)}</strong><small>{allowance ? 'Received' : 'Spent'}</small></div><div className="detail-list">{allowance ? <><Detail label="Note" value={item.note || 'No note'} /><Detail label="Date" value={formatDate(item.date)} /><Detail label="Cycle started" value="Yes" /></> : <><Detail label="Merchant / person" value={item.merchant || 'Unlisted merchant'} /><Detail label="Date & time" value={`${formatDate(item.date)} · ${formatTime(item.time)}`} /><Detail label="Category" value={item.category || 'Other'} /><Detail label="Source" value={item.source === 'email' ? 'FamPay email' : 'Manual entry'} />{item.transactionId && <Detail label="Transaction ID" value={item.transactionId} />}{item.utr && <Detail label="UTR" value={item.utr} />}</>}</div>{onDelete && <button className="delete-button" onClick={onDelete}><Trash2 size={16} /> Delete manual expense</button>}</Modal> }
function Detail({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div> }

export default App
