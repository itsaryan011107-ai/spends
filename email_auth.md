# TASK: Implement Live Gmail Auto-Detection & UPI Receipt Parsing with Google OAuth in Spends

You are an expert full-stack engineer. Implement a production-grade Gmail Auto-Detection feature for our Spends app (React + Vite + Capacitor) that connects to the user's real Google account via Google OAuth 2.0 (`gmail.readonly`), queries the Gmail REST API for UPI payment receipts (FamPay, Google Pay, PhonePe, Paytm, and bank debit alerts), parses the transaction details, and automatically logs them into our local expense ledger without duplicates.

---

### Key Requirements
1. **Google OAuth 2.0 (`gmail.readonly`)**:
   - Use Google Identity Services (`https://accounts.google.com/gsi/client`) token client to authenticate directly on device/client side with zero native backend requirement.
   - Securely save the session token and expiry in `localStorage` (`spends-gmail-token`).
2. **Real Gmail REST API Integration**:
   - Query `https://gmail.googleapis.com/v1/users/me/messages` with filter: `subject:(UPI OR FamPay OR "Google Pay" OR PhonePe OR Paytm OR debited)`.
   - Fetch message details and recursively decode standard and URL-safe base64 MIME parts.
3. **Robust UPI / FamPay Regex Parser**:
   - Accurately extract amount (handles `₹`, `Rs`, `INR`, commas, decimals).
   - Accurately extract merchant/payee (handles `paid ₹X to [Merchant]`, `at [Merchant]`, FamCard purchases, `@fam` UPI IDs).
   - Detect provider (`FamPay`, `Google Pay`, `PhonePe`, `Paytm`, `Bank UPI`).
   - Extract UPI Ref / UTR / Txn ID for strict deduplication.
   - Auto-categorize into Spends' 7 categories: `Food`, `Transport`, `Shopping`, `Entertainment`, `Education`, `Bills`, `Other`.
4. **Offline / Sandbox Test Simulation**:
   - Include realistic test receipts (including FamPay Nescafe, GPay Chai Point, Swiggy, Zepto) so users and developers can test the entire auto-detection pipeline with 1 click without spending real money.
5. **UI & State Integration**:
   - Build `src/components/AutoLogEmailModal.jsx` using `framer-motion` and `lucide-react` matching Spends' exact dark/light aesthetic.
   - Add a `Mail` icon button in the header of `src/App.jsx`.
   - Prevent duplicate entries (checking `upiRef` or merchant + amount).

---

### FILE 1: `index.html`
Ensure the Google Identity Services script is loaded. Add this line inside the `<head>` tag:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>

