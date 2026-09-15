const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
const GMAIL_PROFILE_API = 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
const TOKEN_KEY = 'spends-gmail-token'
export const GMAIL_QUERY = 'subject:(UPI OR FamPay OR "Google Pay" OR PhonePe OR Paytm OR debited)'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export const isDuplicateExpense = (expense, receipt) => {
  if (receipt.upiRef && expense.upiRef) return expense.upiRef === receipt.upiRef
  return (expense.merchant || '').trim().toLowerCase() === (receipt.merchant || '').trim().toLowerCase()
    && Number(expense.amount) === Number(receipt.amount)
    && expense.date === receipt.date
    && (expense.time || '') === (receipt.time || '')
}

export const sandboxReceipts = [
  { id: 'sandbox-fampay-nescafe', subject: 'FamPay payment successful', date: '2026-09-12T09:14:00+05:30', body: 'You paid Rs. 185.00 to Nescafe using your FamCard. UPI Ref: FAM982341. Thank you for using FamPay.' },
  { id: 'sandbox-gpay-chaipoint', subject: 'Payment to Chai Point successful', date: '2026-09-13T16:42:00+05:30', body: 'You paid ₹145 to Chai Point via Google Pay. UPI transaction ID 6248193021.' },
  { id: 'sandbox-gpay-swiggy', subject: 'UPI payment successful', date: '2026-09-14T20:10:00+05:30', body: 'Paid ₹486.50 to Swiggy using Google Pay. UTR: GPAY55667788.' },
  { id: 'sandbox-phonepe-zepto', subject: 'Payment successful', date: '2026-09-15T11:03:00+05:30', body: 'Your PhonePe payment of INR 732.00 at Zepto was successful. Transaction ID: PP11223344.' },
]

const decodeBase64 = (value = '') => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

const cleanText = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()
const headerValue = (headers = [], name) => headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || ''

export function decodeMessagePayload(payload) {
  if (!payload) return ''
  const chunks = []
  if (payload.body?.data) chunks.push(decodeBase64(payload.body.data))
  for (const part of payload.parts || []) chunks.push(decodeMessagePayload(part))
  return cleanText(chunks.join('\n'))
}

const amountFrom = (text) => {
  const matches = [...text.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi)]
  const value = matches.map((match) => Number(match[1].replace(/,/g, ''))).find((amount) => Number.isFinite(amount) && amount > 0)
  return value || 0
}
const firstMatch = (text, patterns) => patterns.map((pattern) => text.match(pattern)?.[1]?.trim()).find(Boolean) || ''

export function categorizeMerchant(merchant = '') {
  const value = merchant.toLowerCase()
  if (/swiggy|zepto|zomato|blinkit|instamart|restaurant|cafe|chai|nescafe|food|pizza|burger|kfc|domino/.test(value)) return 'Food'
  if (/uber|ola|rapido|metro|bus|rail|flight|petrol|fuel|parking|transport/.test(value)) return 'Transport'
  if (/amazon|flipkart|myntra|ajio|zepto|blinkit|mall|store|market|shopping/.test(value)) return 'Shopping'
  if (/netflix|spotify|prime|bookmyshow|hotstar|cinema|game|steam/.test(value)) return 'Entertainment'
  if (/school|college|course|udemy|coursera|book|education/.test(value)) return 'Education'
  if (/electric|water|gas|airtel|jio|vi |recharge|insurance|rent|bill|utility/.test(value)) return 'Bills'
  return 'Other'
}

export function parseUpiReceipt({ body = '', subject = '', id = '', date = '' }) {
  const text = cleanText(`${subject}\n${body}`)
  const amount = amountFrom(text)
  if (!amount) return null
  const provider = /fampay|famcard|fam app/i.test(text) ? 'FamPay' : /google\s*pay|gpay/i.test(text) ? 'Google Pay' : /phonepe/i.test(text) ? 'PhonePe' : /paytm/i.test(text) ? 'Paytm' : /bank|debited|debit alert/i.test(text) ? 'Bank UPI' : 'Bank UPI'
  const merchant = firstMatch(text, [
    /paid\s+(?:₹|rs\.?|inr)\s*[\d,.]+\s+to\s+([^.!\n]+?)(?:\s+(?:via|using|on|for|was\s+successful|is\s+successful|successfully)\b|[.!]|$)/i,
    /(?:payment|purchase)\s+(?:at|to)\s+([^.!\n]+?)(?:\s+(?:via|using|on|for|was\s+successful|is\s+successful|successfully)\b|[.!]|$)/i,
    /(?:at|to)\s+([A-Za-z][A-Za-z0-9 &'._-]{1,50})(?:\s+(?:via|using|on|for|was\s+successful|is\s+successful|successfully)\b|[.!]|$)/i,
    /([A-Za-z][A-Za-z0-9 &'._-]{1,50})\s+using\s+your\s+FamCard/i,
    /([\w.-]+@fam)\b/i,
  ]).replace(/\s+(?:(?:using|with)\s+(?:google pay|phonepe|paytm|fampay)|(?:was|is)\s+successful).*$/i, '').trim()
  const upiRef = firstMatch(text, [
    /(?:upi\s*(?:ref(?:erence)?|transaction|txn)\s*(?:id)?|utr|transaction\s*id|txn\s*id)\s*[:#-]?\s*([A-Z0-9-]{6,})/i,
    /\b([A-Z0-9]{8,})\b/i,
  ])
  const parsedDate = date ? new Date(date) : new Date()
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
  return {
    merchant: merchant || 'UPI payment',
    amount,
    category: categorizeMerchant(merchant),
    provider,
    upiRef: upiRef || `email-${id}`,
    emailId: id,
    date: safeDate.toISOString().slice(0, 10),
    time: safeDate.toTimeString().slice(0, 5),
    source: 'email',
  }
}

const loadGsi = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.oauth2) return resolve()
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.onload = resolve
  script.onerror = () => reject(new Error('Google Identity Services could not load.'))
  document.head.appendChild(script)
})

export const getStoredToken = () => {
  try {
    const token = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
    return token?.expiresAt > Date.now() + 30000 ? token : null
  } catch { return null }
}

export async function requestGmailToken() {
  if (!GOOGLE_CLIENT_ID) throw new Error('Add VITE_GOOGLE_CLIENT_ID to enable Gmail sign-in.')
  await loadGsi()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: async (response) => {
        if (response.error) return reject(new Error(response.error_description || response.error))
        const token = { accessToken: response.access_token, expiresAt: Date.now() + (response.expires_in || 3600) * 1000 }
        try {
          const profile = await getGmailProfile(token.accessToken)
          token.emailAddress = profile.emailAddress || ''
        } catch {
          token.emailAddress = ''
        }
        localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
        resolve(token)
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled.')),
    })
    client.requestAccessToken({ prompt: getStoredToken() ? '' : 'consent' })
  })
}

async function gmailRequest(path, accessToken) {
  const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken)}`)
  if (!response.ok) throw new Error(`Gmail request failed (${response.status}).`)
  return response.json()
}

export async function getGmailProfile(accessToken) {
  return gmailRequest(GMAIL_PROFILE_API, accessToken)
}

export async function fetchGmailReceipts(accessToken) {
  const list = await gmailRequest(`${GMAIL_API}?q=${encodeURIComponent(GMAIL_QUERY)}&maxResults=50`, accessToken)
  const messages = await Promise.all((list.messages || []).map((message) => gmailRequest(`${GMAIL_API}/${message.id}?format=full`, accessToken)))
  return messages.map((message) => parseUpiReceipt({
    id: message.id,
    subject: headerValue(message.payload?.headers, 'Subject'),
    date: headerValue(message.payload?.headers, 'Date'),
    body: decodeMessagePayload(message.payload),
  })).filter(Boolean)
}
