import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Home,
  Moon,
  Play,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { calculateMetrics, spendingByDate, toLocalIsoDate } from './metrics.js'
import spendsLogo from './assets/spends-logo.png'
import spendsLogoWireframe from './assets/spends-logo-wireframe.png'

const today = new Date()
const isoToday = today.toISOString().slice(0, 10)
const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Education', 'Bills', 'Other']
const seedData = {
  allowances: [],
  expenses: [],
}

const money = (value) => `${value < 0 ? '-' : ''}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`
const shortMoney = (value) => `${value < 0 ? '-' : ''}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`
const formatDate = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
const formatMonthDay = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`))
const formatTime = (time) => time ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2026-01-01T${time}`)) : ''
const toDisplayDate = (date) => date ? date.split('-').reverse().join('/') : ''
const toIsoDate = (date) => { const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return match ? `${match[3]}-${match[2]}-${match[1]}` : '' }
const walletStatus = (balance) => balance <= 0 ? { label: 'Critical', mascot: '💀' } : balance < 1000 ? { label: 'Low HP', mascot: '😐' } : balance < 3000 ? { label: 'Getting Risky', mascot: '😐' } : balance < 7500 ? { label: 'Stable', mascot: '😁' } : { label: 'Thriving', mascot: '😁' }

function loadData() {
  try {
    const saved = localStorage.getItem('spends-data') || localStorage.getItem('fincheck-data')
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
  const [insightsAnimation, setInsightsAnimation] = useState(0)
  const [dark, setDark] = useState(() => localStorage.getItem('spends-theme') !== 'light' && localStorage.getItem('fincheck-theme') !== 'light')
  const [toast, setToast] = useState(null)
  const [onboarding, setOnboarding] = useState(() => localStorage.getItem('spends-onboarding-seen') !== 'true')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [tutorialComplete, setTutorialComplete] = useState(() => localStorage.getItem('spends-tutorial-complete') === 'true')
  const [tutorialActive, setTutorialActive] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialBubble, setTutorialBubble] = useState({ top: 0, left: 0 })
  const [simulatedDate, setSimulatedDate] = useState(() => localStorage.getItem('spends-simulated-date') || localStorage.getItem('fincheck-simulated-date') || isoToday)
  const [profile, setProfile] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('spends-profile') || localStorage.getItem('fincheck-profile')); return { name: saved?.name || 'Arjun' } } catch { return { name: 'Arjun' } } })

  const metrics = useMemo(() => calculateMetrics(data, simulatedDate), [data, simulatedDate])

  const tutorialSteps = useMemo(() => [
    { target: 'allowance', eyebrow: 'STEP 1', title: 'Start with allowance', body: 'Begin by entering your allowance so Spends can use it as the starting balance for this cycle.' },
    { target: 'expense', eyebrow: 'STEP 2', title: 'Log expenses regularly', body: 'Keep adding expenses so the forecast stays grounded in the reality of your spending.' },
    { target: 'forecast', eyebrow: 'STEP 3', title: 'Watch the runway forecast', body: 'Spends estimates how long your balance may last based on your recent daily pace.' },
    { target: 'pace', eyebrow: 'STEP 4', title: 'Check your spending pace', body: 'Use this card to spot whether your expenses are rising, falling, or holding steady.' },
    { target: 'average', eyebrow: 'STEP 5', title: 'Review the 7-day average', body: 'This gives you a cleaner view of your recent habits when daily swings feel noisy.' },
    { target: 'spent', eyebrow: 'STEP 6', title: 'See total spent', body: 'Track how much of the cycle budget has already been used so you can course-correct early.' },
  ], [])

  const currentTutorialStep = useMemo(() => tutorialSteps[tutorialStep] || tutorialSteps[0], [tutorialStep, tutorialSteps])

  const persist = (next) => {
    setData(next)
    localStorage.setItem('spends-data', JSON.stringify(next))
  }

  const submitExpense = (form) => {
    if (metrics.balance <= 0) return
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
    localStorage.setItem('spends-theme', next ? 'dark' : 'light')
  }

  const updateProfile = (nextProfile) => {
    setProfile(nextProfile)
    localStorage.setItem('spends-profile', JSON.stringify(nextProfile))
    setModal(null)
  }

  const updateSimulatedDate = (nextDate) => {
    setSimulatedDate(nextDate)
    localStorage.setItem('spends-simulated-date', nextDate)
  }

  const shiftSimulatedDate = (days) => {
    const nextDate = new Date(`${simulatedDate}T00:00:00`)
    nextDate.setDate(nextDate.getDate() + days)
    updateSimulatedDate(toLocalIsoDate(nextDate))
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

  const finishOnboarding = (name) => {
    const nextName = name?.trim()
    if (nextName) {
      const nextProfile = { name: nextName }
      setProfile(nextProfile)
      localStorage.setItem('spends-profile', JSON.stringify(nextProfile))
    }
    localStorage.setItem('spends-onboarding-seen', 'true')
    setOnboarding(false)
  }

  const startTutorial = () => {
    setActiveView('dashboard')
    setTutorialStep(0)
    setTutorialActive(true)
  }

  const finishTutorial = () => {
    localStorage.setItem('spends-tutorial-complete', 'true')
    setTutorialComplete(true)
    setTutorialActive(false)
    setTutorialStep(0)
  }

  const skipTutorial = () => {
    localStorage.setItem('spends-tutorial-complete', 'true')
    setTutorialComplete(true)
    setTutorialActive(false)
    setTutorialStep(0)
  }

  useEffect(() => {
    if (!onboarding && !tutorialComplete && !tutorialActive && activeView === 'dashboard') {
      const timer = window.setTimeout(() => {
        setTutorialActive(true)
        setTutorialStep(0)
      }, 450)
      return () => window.clearTimeout(timer)
    }
  }, [onboarding, tutorialComplete, tutorialActive, activeView])

  useEffect(() => {
    if (!tutorialActive) return

    const stepTarget = currentTutorialStep?.target
    const targetNode = stepTarget ? document.querySelector(`[data-tutorial-target="${stepTarget}"]`) : null

    if (targetNode) {
      targetNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [tutorialActive, currentTutorialStep])

  useEffect(() => {
    if (!tutorialActive) return

    const updateBubblePosition = () => {
      const stepTarget = currentTutorialStep?.target
      const targetNode = stepTarget ? document.querySelector(`[data-tutorial-target="${stepTarget}"]`) : null
      if (!targetNode) return

      const rect = targetNode.getBoundingClientRect()
      const bubbleWidth = 290
      const left = Math.min(Math.max(18, rect.left + rect.width / 2 - bubbleWidth / 2), window.innerWidth - bubbleWidth - 18)
      const top = Math.max(18, rect.top - 155)

      setTutorialBubble((current) => {
        if (Math.abs(current.top - top) < 1 && Math.abs(current.left - left) < 1) {
          return current
        }

        return { top, left }
      })
    }

    updateBubblePosition()
    window.addEventListener('resize', updateBubblePosition)
    window.addEventListener('scroll', updateBubblePosition, true)

    return () => {
      window.removeEventListener('resize', updateBubblePosition)
      window.removeEventListener('scroll', updateBubblePosition, true)
    }
  }, [tutorialActive, currentTutorialStep, data.allowances.length])

  const activity = [...data.expenses.map((item) => ({ ...item, kind: 'expense' })), ...data.allowances.map((item) => ({ ...item, kind: 'allowance' }))].sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`))
  const activeNavIndex = { dashboard: 0, transactions: 1, insights: 2, settings: 3 }[activeView] ?? 0

  return (
    <div className={`${dark ? 'app dark' : 'app'} ${tutorialActive ? 'tutorial-active' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><img src={spendsLogo} alt="" /></span><span>Spends</span></div>
        <button className="profile" onClick={() => setModal('profile')}><div className="avatar">{profile.name.charAt(0).toUpperCase() || 'A'}</div><div><strong>{profile.name || 'Your name'}</strong><span>Personal account</span></div><ChevronRight size={15} /></button>
        <nav className="sidebar-nav" style={{ '--active-index': activeNavIndex }}>
          <NavButton icon={<Home size={18} />} label="Overview" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} animateIcon />
          <NavButton icon={<CreditCard size={18} />} label="Transactions" active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} badge={activity.length} animation="swipe" />
          <NavButton icon={<BarChart3 size={18} />} label="Insights" active={activeView === 'insights'} onClick={() => { setActiveView('insights'); setInsightsAnimation((current) => current + 1) }} animation="bars" />
          <NavButton className="sidebar-settings" icon={<Settings size={18} />} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} animation="adjust" />
          <NavButton className="mobile-settings" icon={<Settings size={18} />} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} animation="adjust" />
        </nav>
        <div className="sidebar-bottom">
          <button className="theme-switch" onClick={toggleTheme}><span>{dark ? <Moon size={17} /> : <Sun size={17} />}</span>{dark ? 'Dark mode' : 'Light mode'}<span className={dark ? 'toggle on' : 'toggle'}><i /></span></button>
          <div className="version">SPENDS V1.0 <span>•</span> LOCAL MODE</div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div><div className="header-mascot">{walletStatus(metrics.balance).mascot}</div><div className="mobile-header-brand"><img src={spendsLogo} alt="" /><span>Spends</span></div><h1>{activeView === 'dashboard' ? 'Your wallet lore, at a glance.' : activeView === 'transactions' ? 'Transactions' : activeView === 'insights' ? 'Your spending patterns.' : activeView === 'faq' ? 'Answers, at a glance.' : 'Preferences.'}</h1></div><div className="top-actions"><button className="icon-button" title="Replay tutorial" onClick={startTutorial}><Play size={17} /></button><button className="icon-button" title="Frequently asked questions" onClick={() => setActiveView('faq')}><CircleHelp size={19} /></button><div className="online"><span /> Local data only</div></div></header>
        {activeView === 'dashboard' && <Dashboard metrics={metrics} activity={activity} simulatedDate={simulatedDate} onAddExpense={() => setModal('expense')} onAddAllowance={() => setModal('allowance')} onSelect={setSelected} />}
        {activeView === 'transactions' && <Transactions activity={activity} canAddExpense={metrics.balance > 0} onAddExpense={() => setModal('expense')} onAddAllowance={() => setModal('allowance')} onSelect={setSelected} />}
        {activeView === 'insights' && <Insights metrics={metrics} spendingDays={spendingByDate(data.expenses, simulatedDate)} animationKey={insightsAnimation} />}
        {activeView === 'faq' && <Faq />}
        {activeView === 'settings' && <SettingsView dark={dark} onToggleTheme={toggleTheme} data={data} metrics={metrics} simulatedDate={simulatedDate} onDateChange={updateSimulatedDate} onShiftDate={shiftSimulatedDate} onResetLedger={resetLedger} onClearExpenses={clearExpenses} onSetBalance={setTestBalance} />}
      </main>
      {modal === 'expense' && <ExpenseModal currentDate={simulatedDate} onClose={() => setModal(null)} onSubmit={submitExpense} />}
      {modal === 'allowance' && <AllowanceModal currentDate={simulatedDate} onClose={() => setModal(null)} onSubmit={submitAllowance} />}
      {modal === 'profile' && <ProfileModal profile={profile} onClose={() => setModal(null)} onSubmit={updateProfile} />}
      {selected && <DetailsModal item={selected} onClose={() => setSelected(null)} onDelete={selected.kind === 'expense' && selected.source === 'manual' ? () => deleteExpense(selected.id) : null} />}
      <AnimatePresence>
        {tutorialActive && currentTutorialStep && (
          <motion.div
            className="tutorial-bubble"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, left: tutorialBubble.left, top: tutorialBubble.top }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.36, ease: 'easeOut' }}
            style={{ top: tutorialBubble.top, left: tutorialBubble.left }}
          >
            <div className="tutorial-bubble-header">
              <span>{currentTutorialStep.eyebrow}</span>
            </div>
            <h3>{currentTutorialStep.title}</h3>
            <p>{currentTutorialStep.body}</p>
            <div className="tutorial-bubble-actions">
              <button className="tutorial-button ghost" type="button" onClick={() => setTutorialStep((step) => Math.max(0, step - 1))} disabled={tutorialStep === 0}>Back</button>
              <button className="tutorial-button secondary" type="button" onClick={skipTutorial}>Skip Tutorial</button>
              <button className="tutorial-button primary" type="button" onClick={tutorialStep === tutorialSteps.length - 1 ? finishTutorial : () => setTutorialStep((step) => Math.min(tutorialSteps.length - 1, step + 1))}>{tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Continue'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast && <div className="toast"><span className="toast-icon"><Check size={16} /></span><div><strong>{toast}</strong><small>Balance updated from your ledger</small></div><button onClick={() => setToast(null)}><X size={16} /></button></div>}
      {onboarding && <Onboarding step={onboardingStep} onStepChange={setOnboardingStep} onFinish={finishOnboarding} initialName={profile.name} />}
    </div>
  )
}

function Onboarding({ step, onStepChange, onFinish, initialName }) {
    const [name, setName] = useState(initialName === 'Arjun' ? '' : initialName)
    const slides = [
      <div className="onboarding-slide onboarding-brand" key="brand"><img src={spendsLogo} alt="" /><div className="onboarding-kicker">WELCOME TO</div><h2>Spends</h2><p>Your money, before it runs out.</p></div>,
      <div className="onboarding-slide" key="problem"><span className="onboarding-number">01</span><div className="onboarding-kicker">THE PROBLEM</div><h2>Tired of going broke before your next allowance?</h2><p>Not anymore. Spends gives your money a little more foresight, so you can see the runway before it disappears.</p></div>,
      <div className="onboarding-slide" key="how"><span className="onboarding-number">02</span><div className="onboarding-kicker">HOW IT WORKS</div><h2>Know when your money runs out.</h2><p>Add your allowance and log each expense. Based on your spending habits, Spends tells you how many days your balance may last at this pace.</p></div>,
      <div className="onboarding-slide onboarding-name-slide" key="name"><span className="onboarding-number">03</span><div className="onboarding-kicker">MAKE IT YOURS</div><h2>What should we call you?</h2><p>Use your name to personalize your Spends experience.</p><label>Name<input autoFocus={step === 3} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label></div>,
    ]

    return <div className="modal-backdrop onboarding-backdrop">
      <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="onboarding-close" onClick={onFinish} aria-label="Skip introduction"><X size={18} /></button>
        <div className="onboarding-viewport"><div className="onboarding-track" style={{ transform: `translateX(-${step * 100}%)` }}>{slides}</div></div>
        <div className="onboarding-footer">
          <div className="onboarding-dots" aria-label={`Introduction step ${step + 1} of ${slides.length}`}>{slides.map((slide, index) => <button key={slide.key} className={index === step ? 'active' : ''} onClick={() => onStepChange(index)} aria-label={`Go to introduction step ${index + 1}`} />)}</div>
          {step < slides.length - 1 ? <button className="onboarding-next" onClick={() => onStepChange(step + 1)}>Next <ChevronRight size={16} /></button> : <button className="onboarding-next" onClick={() => onFinish(name)}>Get started <ChevronRight size={16} /></button>}
        </div>
      </section>
    </div>
  }

function NavButton({ icon, label, active, onClick, badge, className = '', animateIcon = false, animation = '' }) {
  const [iconAnimation, setIconAnimation] = useState(0)
  const handleClick = () => {
    if (animateIcon || animation) setIconAnimation((current) => current + 1)
    onClick()
  }
  const iconClass = animateIcon ? 'nav-icon nav-icon-roll' : `nav-icon ${animation ? `nav-icon-${animation}` : ''}`
  return <button className={`${active ? 'nav-button active' : 'nav-button'} ${className}`} onClick={handleClick}><span key={animateIcon || animation ? iconAnimation : undefined} className={iconClass}>{icon}</span><span>{label}</span>{badge && <b>{badge}</b>}</button>
}

function Dashboard({ metrics, activity, simulatedDate, onAddExpense, onAddAllowance, onSelect }) {
  const status = walletStatus(metrics.balance)
  return <div className="content dashboard-content"><OverviewHoverSurface>
    <HoverSliderGroup className="hero-grid">
      <div className="balance-card overview-hover-card"><img className="balance-wireframe" src={spendsLogoWireframe} alt="" /><div className="card-label light-label"><span className="status-dot" /> WALLET</div><div className="balance-value">{money(metrics.balance)}</div><p className="balance-caption">{status.mascot} Status: <strong>{status.label}</strong> · as of {toDisplayDate(simulatedDate)}</p><div className="hp-meter"><span style={{ width: `${Math.min(100, Math.max(4, metrics.balance / Math.max(metrics.latestAllowance?.amount || metrics.balance, 1) * 100))}%` }} /></div><div className="balance-footer"><span><ArrowDownLeft size={15} /> {money(metrics.totalReceived)} received</span><span><ArrowUpRight size={15} /> {money(metrics.totalSpent)} spent</span></div></div>
      <button className="expense-hero-card overview-hover-card" data-tutorial-target="expense" disabled={metrics.balance <= 0} onClick={onAddExpense}><span className="expense-hero-icon"><Plus size={34} /></span><span className="card-label">QUICK LOG</span><strong>Add Expense</strong><p>{metrics.balance > 0 ? 'Quickly log spending before you forget.' : 'Add allowance before logging spending.'}</p></button>
    </HoverSliderGroup>
    <HoverSliderGroup className="metric-grid">
      <Metric label="Spending pace" value={`${money(metrics.dailyAverage)}/day`} detail="Since latest allowance" accent="green" tutorialTarget="pace" />
      <Metric label="7-day average" value={`${money(metrics.rollingAverage)}/day`} detail="Includes zero-spend days" tutorialTarget="average" />
      <Metric label="Total spent" value={money(metrics.totalSpent)} detail={`${metrics.totalReceived ? Math.round(metrics.totalSpent / metrics.totalReceived * 100) : 0}% of money received`} tutorialTarget="spent" />
    </HoverSliderGroup>
    <HoverSliderGroup className="lower-grid">
      <div className="panel forecast-panel overview-hover-card" data-tutorial-target="forecast"><div className="card-label">RUNWAY FORECAST</div><h2>{metrics.runway ? `${Math.round(metrics.runway)} days until going broke` : 'Not enough data'}</h2><p>{metrics.runway ? 'At current pace' : 'Add spending data to estimate how long your balance may last.'}</p>{metrics.runout && <div className="forecast-date">Projected run-out <strong>{metrics.runout.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></div>}</div>
      <div className="panel cycle-panel overview-hover-card" data-tutorial-target="allowance"><div className="card-label">THIS CYCLE</div><h2>{metrics.latestAllowance ? money(metrics.latestAllowance.amount) : '—'}</h2><p>{metrics.latestAllowance ? `Received ${formatMonthDay(metrics.latestAllowance.date)}${metrics.latestAllowance.note ? ` · ${metrics.latestAllowance.note}` : ''}` : 'No resources detected. Touch grass or add allowance.'}</p><div className="cycle-stat"><span>Spent this cycle</span><strong>{money(metrics.cycleSpent)}</strong></div><div className="cycle-stat"><span>Cycle pace</span><strong>{money(metrics.cycleAverage)}<small>/day</small></strong></div><button className="outline-button full" onClick={onAddAllowance}><Plus size={16} /> Add allowance</button></div>
    </HoverSliderGroup>
  </OverviewHoverSurface></div>
}

function OverviewHoverSurface({ children }) {
  const groupRef = useRef(null)
  const [slider, setSlider] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 })

  const handlePointerOver = (event) => {
    const card = event.target.closest('.overview-hover-card')
    if (!card || !groupRef.current?.contains(card)) return
    const groupBounds = groupRef.current.getBoundingClientRect()
    const cardBounds = card.getBoundingClientRect()
    setSlider({
      left: cardBounds.left - groupBounds.left,
      top: cardBounds.top - groupBounds.top,
      width: cardBounds.width,
      height: cardBounds.height,
      opacity: 1,
    })
  }

  return <div
    ref={groupRef}
    className="overview-hover-surface"
    onPointerOver={handlePointerOver}
    onPointerLeave={() => setSlider((current) => ({ ...current, opacity: 0 }))}
    style={{
      '--hover-slider-left': `${slider.left}px`,
      '--hover-slider-top': `${slider.top}px`,
      '--hover-slider-width': `${slider.width}px`,
      '--hover-slider-height': `${slider.height}px`,
      '--hover-slider-opacity': slider.opacity,
    }}
  >
    <span className="overview-hover-slider" aria-hidden="true" />
    {children}
  </div>
}

function HoverSliderGroup({ className, children }) {
  return <section className={`overview-hover-group ${className}`}>{children}</section>
}

function Metric({ label, value, detail, accent, tutorialTarget }) { return <div className="metric overview-hover-card" data-tutorial-target={tutorialTarget}><span className="metric-label">{label}</span><strong className={accent === 'green' ? 'green-text' : ''}>{value}</strong><small>{detail}</small></div> }
function ActivityRow({ item, onClick }) { const allowance = item.kind === 'allowance'; return <button className="activity-row" onClick={onClick}><span className={allowance ? 'activity-icon allowance' : 'activity-icon expense'}>{allowance ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="activity-main"><strong>{allowance ? (item.note || 'Allowance') : (item.merchant || 'Expense')}</strong><small>{formatMonthDay(item.date)}{item.time ? ` · ${formatTime(item.time)}` : ''} · {allowance ? 'Money in' : `${item.category || 'Other'} · ${item.source === 'email' ? 'Imported' : 'Manual'}`}</small></span><strong className={allowance ? 'amount positive' : 'amount'}>{allowance ? '+' : '-'}{shortMoney(item.amount)}</strong><ChevronRight size={16} className="row-chevron" /></button> }

function Transactions({ activity, canAddExpense, onAddExpense, onAddAllowance, onSelect }) { const [filter, setFilter] = useState('all'); const filtered = filter === 'all' ? activity : activity.filter((item) => item.kind === filter); return <div className="content transactions-content"><div className="view-toolbar"><div><div className="card-label">LEDGER</div><h2>All activity <span className="count-pill">{activity.length}</span></h2></div><div className="toolbar-actions"><button className="secondary-button" onClick={onAddAllowance}><ArrowDownLeft size={16} /> Allowance</button><button className="primary-button" disabled={!canAddExpense} onClick={onAddExpense}><Plus size={16} /> Expense</button></div></div><div className="filter-row"><div className="segmented"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'expense' ? 'selected' : ''} onClick={() => setFilter('expense')}>Expenses</button><button className={filter === 'allowance' ? 'selected' : ''} onClick={() => setFilter('allowance')}>Allowances</button></div><div className="search-box"><Search size={16} /><input placeholder="Search activity" /></div></div><div className="table-panel"><div className="table-header"><span>ACTIVITY</span><span>DATE</span><span>SOURCE</span><span>AMOUNT</span><span /></div>{filtered.map((item) => <button className="table-row" key={`${item.kind}-${item.id}`} onClick={() => onSelect(item)}><span className="table-activity"><span className={item.kind === 'allowance' ? 'activity-icon allowance' : 'activity-icon expense'}>{item.kind === 'allowance' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span><strong>{item.kind === 'allowance' ? item.note || 'Allowance' : item.merchant || 'Expense'}</strong><small>{item.kind === 'allowance' ? 'Money received' : item.category || 'Other'}</small></span></span><span>{formatDate(item.date)}{item.time && <small>{formatTime(item.time)}</small>}</span><span className="source-tag">{item.kind === 'allowance' ? 'Manual' : item.source === 'email' ? 'FamPay email' : 'Manual'}</span><strong className={item.kind === 'allowance' ? 'positive' : ''}>{item.kind === 'allowance' ? '+' : '-'}{shortMoney(item.amount)}</strong><ChevronRight size={16} /></button>)}</div></div> }

function Insights({ metrics, spendingDays, animationKey }) { const max = Math.max(...spendingDays.map((day) => day.amount), 1); const barOrder = [3, 0, 5, 1, 6, 2, 4]; return <div className="content"><div className="view-toolbar"><div><div className="card-label">INSIGHTS</div><h2>Make your money last.</h2></div></div><section className="insight-grid"><div className="panel insight-main"><div className="panel-head"><div><div className="card-label">LAST 7 DAYS</div><h2>Spending rhythm</h2></div><span className="trend-chip"><BarChart3 size={15} /> {money(metrics.rollingAverage)}/day</span></div><div className="bar-chart" key={animationKey}>{spendingDays.map((day, index) => { const date = new Date(`${day.date}T00:00:00`); const sequence = barOrder[index % barOrder.length]; return <div className="bar-column" key={day.date}><span className="bar-value">{day.amount ? shortMoney(day.amount) : ''}</span><div className="bar-track"><i className={animationKey ? 'bar-pulse' : ''} style={{ height: `${Math.max(5, day.amount / max * 100)}%`, '--bar-delay': `${sequence * 70}ms` }} /></div><small>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</small></div> })}</div></div><div className="panel velocity-panel"><div className="card-label">SPENDING PACE</div><h2>{metrics.rollingAverage < metrics.cycleAverage ? 'Cooling down' : metrics.rollingAverage > metrics.cycleAverage ? 'Picking up' : 'Holding steady'}</h2><p>Compared with your current allowance-cycle pace.</p><div className="velocity-line"><span style={{ width: `${Math.min(100, metrics.cycleAverage ? metrics.rollingAverage / metrics.cycleAverage * 50 : 50)}%` }} /></div><div className="velocity-values"><span>Recent <strong>{money(metrics.rollingAverage)}/d</strong></span><span>Cycle <strong>{money(metrics.cycleAverage)}/d</strong></span></div></div></section><section className="panel principles"><div className="card-label">HOW SPENDS THINKS</div><div className="principle-list"><div><span>01</span><strong>Your balance is yours</strong><p>Only allowances and expenses you log change it. Reported payment-provider balances are never used.</p></div><div><span>02</span><strong>Recent behavior matters</strong><p>Your forecast uses the latest 7 days first, with sensible fallbacks when history is short.</p></div><div><span>03</span><strong>No monthly reset</strong><p>Allowance cycles begin whenever money arrives. Your lifetime history stays intact.</p></div></div></section></div> }

function Faq() { const questions = [{ question: 'What is an allowance cycle?', answer: 'A cycle starts on the date of your latest allowance. It measures spending since that allowance. Starting a new cycle does not erase your transaction history or reset lifetime metrics.' }, { question: 'What is local mode?', answer: 'Local mode means Spends stores your data only in this browser on this device. It is not synced to a server or shared across browsers yet.' }, { question: 'Is my financial data private?', answer: 'Your data stays in the browser only. Spends V1 does not send your ledger to a server, and the app never uses a payment provider’s reported balance as its source of truth.' }, { question: 'What is runway forecast?', answer: 'Runway forecast estimates how many days your current balance may last at your recent spending pace. It uses the 7-day average first, then the current cycle average, then the lifetime average.' }]; return <div className="content faq-content"><div className="view-toolbar"><div><div className="card-label">HELP CENTER</div><h2>Frequently asked questions</h2></div></div><div className="faq-list">{questions.map((item, index) => <article className="faq-item" key={item.question}><span className="faq-number">0{index + 1}</span><div><h3>{item.question}</h3><p>{item.answer}</p></div></article>)}</div></div> }

function SettingsView({ dark, onToggleTheme, data, metrics, simulatedDate, onDateChange, onShiftDate, onResetLedger, onClearExpenses, onSetBalance }) { const [targetBalance, setTargetBalance] = useState(metrics.balance); return <div className="content settings-content"><div className="view-toolbar"><div><div className="card-label">SETTINGS</div><h2>Keep it personal.</h2></div></div><div className="settings-panel"><div className="setting-row"><span className="setting-icon"><Sun size={18} /></span><span><strong>Appearance</strong><small>Choose the look that feels right</small></span><button className="setting-control" onClick={onToggleTheme}>{dark ? 'Dark mode' : 'Light mode'} <Sun size={15} /></button></div><div className="setting-row"><span className="setting-icon"><CreditCard size={18} /></span><span><strong>Email connection</strong><small>FamPay email import will be available here</small></span><span className="coming-soon">Coming soon</span></div><div className="setting-row"><span className="setting-icon"><CircleHelp size={18} /></span><span><strong>Notifications</strong><small>In-app notifications are enabled</small></span><span className="switch on"><i /></span></div></div><div className="dev-panel"><div className="dev-heading"><div><div className="card-label">DEVELOPER TOOLS</div><h2>Test your ledger</h2></div><span className="dev-badge">LOCAL ONLY</span></div><p className="dev-intro">Use simulated dates and quick ledger actions to test multiple spending days. These controls write to the same local data as normal entries.</p><div className="dev-section"><div><strong>Simulated date</strong><small>New expense and allowance forms use this date.</small></div><div className="date-controls"><input type="date" value={simulatedDate} onChange={(event) => onDateChange(event.target.value)} /><button className="setting-control" onClick={() => onShiftDate(-1)}>− 1 day</button><button className="setting-control" onClick={() => onShiftDate(1)}>+ 1 day</button></div></div><div className="dev-section"><div><strong>Balance target</strong><small>Creates a ledger adjustment to reach the chosen balance.</small></div><div className="balance-control"><span>₹</span><input type="number" min="0" value={targetBalance} onChange={(event) => setTargetBalance(event.target.value)} /><button className="setting-control" onClick={() => onSetBalance(targetBalance)}>Set balance</button></div></div><div className="dev-section danger-section"><div><strong>Clear test data</strong><small>{data.expenses.length} expenses · {data.allowances.length} allowances currently stored</small></div><div className="dev-actions"><button className="danger-button" onClick={onClearExpenses}><Trash2 size={15} /> Clear expenses</button><button className="danger-button solid" onClick={onResetLedger}><Trash2 size={15} /> Reset ledger</button></div></div></div><div className="explainer-grid"><div><strong>What is a cycle?</strong><p>A cycle starts on the date of your latest allowance. It measures spending since that allowance and does not erase lifetime history.</p></div><div><strong>What is local mode?</strong><p>Your data is stored only in this browser on this device. Nothing is synced or sent to a server yet.</p></div><div><strong>How do metrics handle old dates?</strong><p>Each expense uses its entered date and time. Gaps between transactions count as zero-spending days, even across months.</p></div></div><div className="privacy-note"><strong>Your data stays in this browser.</strong><p>Spends V1 uses local storage while the database and secure email authorization layer are being built.</p></div></div> }

function Modal({ title, eyebrow, children, onClose }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="card-label">{eyebrow}</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>{children}</div></div> }
function ProfileModal({ profile, onClose, onSubmit }) { const [name, setName] = useState(profile.name); return <Modal title="Personal account" eyebrow="PROFILE" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSubmit({ name: name.trim() || 'Arjun' }) }}><div className="profile-editor"><div className="profile-editor-avatar">{(name || 'A').charAt(0).toUpperCase()}</div><p>Update your name and personalize your Spends experience.</p></div><div className="form-grid single"><label>Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label></div><div className="google-coming-soon">Google sign in coming soon</div><button className="primary-button submit-button" type="submit"><Check size={17} /> Save profile</button></form></Modal> }
function DateInput({ value, onChange }) { const [display, setDisplay] = useState(toDisplayDate(value)); const update = (nextValue) => { setDisplay(nextValue); const isoValue = toIsoDate(nextValue); if (isoValue) onChange(isoValue) }; return <input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={display} onChange={(event) => update(event.target.value)} required /> }
function ExpenseModal({ currentDate, onClose, onSubmit }) { const [form, setForm] = useState({ amount: '', date: currentDate, time: new Date().toTimeString().slice(0, 5), category: 'Other' }); const update = (key, value) => setForm({ ...form, [key]: value }); return <Modal title="Add an expense" eyebrow="MONEY OUT" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (form.amount && form.date) onSubmit(form) }}><div className="amount-input"><span>₹</span><input autoFocus type="number" min="1" placeholder="0" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></div><div className="form-grid"><label>Date<DateInput value={form.date} onChange={(value) => update('date', value)} /></label><label>Time<input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} required /></label><label>Category<select value={form.category} onChange={(e) => update('category', e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div><button className="primary-button submit-button" type="submit"><Plus size={17} /> Add expense</button></form></Modal> }
function AllowanceModal({ currentDate, onClose, onSubmit }) { const [form, setForm] = useState({ amount: '', date: currentDate, note: '' }); const update = (key, value) => setForm({ ...form, [key]: value }); return <Modal title="Add an allowance" eyebrow="MONEY IN" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (form.amount && form.date) onSubmit(form) }}><div className="amount-input"><span>₹</span><input autoFocus type="number" min="1" placeholder="0" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></div><div className="form-grid single"><label>Date<DateInput value={form.date} onChange={(value) => update('date', value)} /></label><label>Note <span>optional</span><input value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="e.g. Dad, scholarship" /></label></div><button className="primary-button submit-button" type="submit"><ArrowDownLeft size={17} /> Add allowance</button></form></Modal> }
function DetailsModal({ item, onClose, onDelete }) { const allowance = item.kind === 'allowance'; return <Modal title={allowance ? 'Allowance details' : 'Expense details'} eyebrow={allowance ? 'MONEY IN' : 'MONEY OUT'} onClose={onClose}><div className="detail-amount"><span className={allowance ? 'activity-icon allowance' : 'activity-icon expense'}>{allowance ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span><strong className={allowance ? 'positive' : ''}>{allowance ? '+' : '-'}{money(item.amount)}</strong><small>{allowance ? 'Received' : 'Spent'}</small></div><div className="detail-list">{allowance ? <><Detail label="Note" value={item.note || 'No note'} /><Detail label="Date" value={formatDate(item.date)} /><Detail label="Cycle started" value="Yes" /></> : <><Detail label="Merchant / person" value={item.merchant || 'Unlisted merchant'} /><Detail label="Date & time" value={`${formatDate(item.date)} · ${formatTime(item.time)}`} /><Detail label="Category" value={item.category || 'Other'} /><Detail label="Source" value={item.source === 'email' ? 'FamPay email' : 'Manual entry'} />{item.transactionId && <Detail label="Transaction ID" value={item.transactionId} />}{item.utr && <Detail label="UTR" value={item.utr} />}</>}</div>{onDelete && <button className="delete-button" onClick={onDelete}><Trash2 size={16} /> Delete manual expense</button>}</Modal> }
function Detail({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div> }

export default App
