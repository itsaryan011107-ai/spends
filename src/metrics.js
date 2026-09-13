const DAY_MS = 86400000

export const toLocalIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateValue = (date, time = '00:00') => new Date(`${date}T${time || '00:00'}:00`).getTime()
const amountValue = (item) => Number(item.amount) || 0
const daysBetweenDates = (from, to) => Math.max(0, Math.floor((dateValue(to) - dateValue(from)) / DAY_MS))
const isOnOrBefore = (date, currentDate) => date <= currentDate

export function calculateMetrics(data, currentDate) {
  const allExpenses = data.expenses || []
  const allAllowances = data.allowances || []
  const expenses = allExpenses.filter((item) => isOnOrBefore(item.date, currentDate))
  const allowances = allAllowances.filter((item) => isOnOrBefore(item.date, currentDate))
  const totalSpent = expenses.reduce((sum, item) => sum + amountValue(item), 0)
  const totalReceived = allowances.reduce((sum, item) => sum + amountValue(item), 0)
  const balance = totalReceived - totalSpent
  const latestAllowance = [...allowances].sort((a, b) => dateValue(b.date) - dateValue(a.date))[0]
  const firstDate = [...expenses, ...allowances].map((item) => item.date).sort()[0] || currentDate
  const daysSinceLatestAllowance = latestAllowance ? Math.max(1, daysBetweenDates(latestAllowance.date, currentDate)) : 0
  const cycleExpenses = latestAllowance
    ? expenses.filter((item) => dateValue(item.date, item.time) > dateValue(latestAllowance.date, '08:00'))
    : []
  const cycleSpent = cycleExpenses.reduce((sum, item) => sum + amountValue(item), 0)
  const dailyAverage = latestAllowance ? cycleSpent / daysSinceLatestAllowance : 0
  const rollingStart = new Date(`${currentDate}T00:00:00`)
  rollingStart.setDate(rollingStart.getDate() - 6)
  const rollingStartIso = toLocalIsoDate(rollingStart)
  const rollingSpent = allowances.length === 0 ? 0 : expenses
    .filter((item) => item.date >= rollingStartIso && item.date <= currentDate)
    .reduce((sum, item) => sum + amountValue(item), 0)
  const rollingAverage = rollingSpent / 7
  const spendRate = daysSinceLatestAllowance < 7 ? dailyAverage : rollingAverage
  const runway = spendRate > 0 && balance > 0 ? balance / spendRate : null
  const runout = runway ? new Date(dateValue(currentDate) + runway * DAY_MS) : null
  return {
    totalSpent,
    totalReceived,
    balance,
    latestAllowance,
    cycleSpent,
    cycleDays: daysSinceLatestAllowance,
    dailyAverage,
    cycleAverage: dailyAverage,
    rollingSpent,
    rollingAverage,
    spendRate,
    runway,
    runout,
    trackingDays: daysBetweenDates(firstDate, currentDate) || 1,
  }
}

export function spendingByDate(expenses, currentDate) {
  const rollingStart = new Date(`${currentDate}T00:00:00`)
  rollingStart.setDate(rollingStart.getDate() - 6)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(rollingStart)
    date.setDate(date.getDate() + index)
    const dateIso = toLocalIsoDate(date)
    return {
      date: dateIso,
      amount: expenses.filter((item) => item.date === dateIso).reduce((sum, item) => sum + amountValue(item), 0),
    }
  })
}
