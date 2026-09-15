import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, FlaskConical, LoaderCircle, Mail, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { fetchGmailReceipts, getGmailProfile, getStoredToken, isDuplicateExpense, parseUpiReceipt, requestGmailToken, sandboxReceipts } from '../gmail.js'

const money = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function AutoLogEmailModal({ existingExpenses, allowanceDate, onClose, onImport }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState(() => getStoredToken() ? 'Gmail is connected. Scan for new UPI receipts.' : 'Connect Gmail to find recent UPI receipts.')
  const [receipts, setReceipts] = useState([])
  const [storedToken] = useState(getStoredToken)
  const [connected, setConnected] = useState(Boolean(storedToken))
  const [accountEmail, setAccountEmail] = useState(storedToken?.emailAddress || '')

  useEffect(() => {
    if (!storedToken || storedToken.emailAddress) return
    getGmailProfile(storedToken.accessToken).then((profile) => {
      if (!profile.emailAddress) return
      setAccountEmail(profile.emailAddress)
      localStorage.setItem('spends-gmail-token', JSON.stringify({ ...storedToken, emailAddress: profile.emailAddress }))
    }).catch(() => {})
  }, [storedToken])

  const runImport = async (loader, label, requiresAllowance = true) => {
    if (requiresAllowance && !allowanceDate) {
      setReceipts([])
      setStatus('preview')
      setMessage('Add an allowance first to start an email import cycle.')
      return
    }
    setStatus('loading')
    setMessage(label)
    try {
      const parsed = (await loader()).filter((receipt) => allowanceDate && receipt.date >= allowanceDate)
      setReceipts(parsed)
      setStatus('preview')
      setMessage(parsed.length ? `${parsed.length} receipt${parsed.length === 1 ? '' : 's'} from this allowance cycle ready to review.` : allowanceDate ? 'No supported receipts found after your latest allowance.' : 'Gmail connected. Add an allowance to activate payment detection.')
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const connectAndScan = async () => {
    await runImport(async () => {
      const token = await requestGmailToken()
      setConnected(true)
      setAccountEmail(token.emailAddress || '')
      return fetchGmailReceipts(token.accessToken)
    }, 'Connecting securely to Gmail…', false)
  }

  const simulate = () => runImport(async () => sandboxReceipts.map(parseUpiReceipt).filter(Boolean), 'Running sandbox receipts…')

  const duplicateCount = (receipt) => existingExpenses.some((expense) => isDuplicateExpense(expense, receipt))
  const freshReceipts = receipts.filter((receipt) => !duplicateCount(receipt))
  const importReceipts = () => {
    onImport(freshReceipts)
    setStatus('complete')
    setMessage(freshReceipts.length ? `${freshReceipts.length} receipt${freshReceipts.length === 1 ? '' : 's'} added to your ledger.` : 'Everything found was already in your ledger.')
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <motion.div className="modal email-modal" role="dialog" aria-modal="true" initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head"><div><div className="card-label">AUTO-LOG</div><h2>Find UPI receipts</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <div className="email-privacy"><ShieldCheck size={18} /><span><strong>Read-only and local</strong><small>Spends reads matching receipt emails. Your token and ledger stay on this device.</small></span></div>
      <div className={connected ? 'gmail-connection connected' : 'gmail-connection'}><span className="connection-dot" /><div className="gmail-connection-copy"><small>{connected ? 'Payment detection is wired in and ready to scan.' : 'Connect Gmail to activate payment detection.'}</small><strong>{connected ? 'Gmail connected' : 'Gmail not connected'}</strong>{accountEmail && <code><Mail size={12} /> {accountEmail}</code>}</div></div>
      <p className="email-status">{status === 'loading' && <LoaderCircle className="spin" size={15} />}{message}</p>
      {status === 'idle' && <div className="email-actions"><button className="primary-button" onClick={connectAndScan}><Mail size={17} /> {connected ? 'Scan Gmail again' : 'Connect Gmail'}</button><button className="secondary-button" onClick={simulate}><FlaskConical size={16} /> Try sandbox receipts</button></div>}
      {status === 'error' && <div className="email-actions"><button className="primary-button" onClick={connectAndScan}><RefreshCw size={16} /> Try again</button><button className="secondary-button" onClick={simulate}><FlaskConical size={16} /> Use sandbox</button></div>}
      {['preview', 'complete'].includes(status) && <>
        <div className="receipt-list">{receipts.map((receipt) => <motion.div className={`receipt-row ${duplicateCount(receipt) ? 'duplicate' : ''}`} key={`${receipt.emailId}-${receipt.upiRef}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}><div><strong>{receipt.merchant}</strong><small>{receipt.provider} · {receipt.category} · {receipt.date}</small></div><span>{money(receipt.amount)}{duplicateCount(receipt) && <em>Already logged</em>}</span></motion.div>)}</div>
        {status === 'preview' && <button className="primary-button submit-button" onClick={importReceipts}><Check size={17} /> Add {freshReceipts.length} new receipt{freshReceipts.length === 1 ? '' : 's'}</button>}
        {status === 'complete' && <button className="secondary-button submit-button" onClick={onClose}>Done</button>}
      </>}
      <div className="email-footnote">Gmail permission: <code>gmail.readonly</code> · Supports FamPay, Google Pay, PhonePe, Paytm and bank debit alerts.</div>
    </motion.div>
  </div>
}
