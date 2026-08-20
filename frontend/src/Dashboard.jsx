import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from './api'

const RANGES = [
  { label: '30d',  days: 30 },
  { label: '90d',  days: 90 },
  { label: '1y',   days: 365 },
  { label: 'All',  days: null },
]

function dateRange(days) {
  if (!days) return {}
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  }
}

const CAT_COLORS = ['#6366f1','#f97316','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#9ca3af']
const FREQ_BADGE = {
  weekly:  'bg-blue-100 text-blue-700',
  monthly: 'bg-indigo-100 text-indigo-700',
  annual:  'bg-emerald-100 text-emerald-700',
}

const $   = (n) => `$${parseFloat(n).toFixed(2)}`
const cat = (s) => (s || 'Uncategorized').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const tooltipStyle = {
  borderRadius: 8,
  border: 'none',
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
  fontSize: 13,
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function CategoryChart({ data }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Spend by Category</p>
      {data.length === 0 ? <p className="text-gray-400 text-sm">No data yet.</p> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
            <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="category" width={155} tickFormatter={cat} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => $(v)} labelFormatter={cat} contentStyle={tooltipStyle} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function MonthlyChart({ data }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Monthly Spending</p>
      {data.length === 0 ? <p className="text-gray-400 text-sm">No data yet.</p> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ right: 8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => $(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function SubscriptionList({ subscriptions }) {
  const monthlyTotal = subscriptions.reduce((sum, s) => {
    if (s.frequency === 'monthly') return sum + s.amount
    if (s.frequency === 'weekly')  return sum + s.amount * 4.33
    if (s.frequency === 'annual')  return sum + s.amount / 12
    return sum
  }, 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Detected Subscriptions</p>
        {subscriptions.length > 0 && (
          <p className="text-xs text-gray-400">
            ~<strong className="text-gray-700">{$(monthlyTotal)}</strong> / mo total
          </p>
        )}
      </div>
      {subscriptions.length === 0 ? (
        <p className="text-gray-400 text-sm">No recurring charges detected yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {subscriptions.map(s => (
            <li key={s.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-500 text-sm flex-shrink-0">
                  {s.merchant_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{s.merchant_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQ_BADGE[s.frequency] || 'bg-gray-100 text-gray-600'}`}>
                      {s.frequency}
                    </span>
                    <span className="text-xs text-gray-400">last charged {s.last_charged}</span>
                  </div>
                </div>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{$(s.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TransactionTable({ transactions }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Recent Transactions</p>
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-sm">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Merchant</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 font-medium text-gray-800">{t.merchant_name || t.name}</td>
                  <td className="py-3">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {cat(t.category)}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">{t.date}</td>
                  <td className="py-3 font-semibold text-gray-900 text-right">{$(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ onConnect, onHome }) {
  const [summary, setSummary]           = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [syncing, setSyncing]           = useState(false)
  const [range, setRange]               = useState(RANGES[0])

  const load = async (r = range) => {
    const { start_date, end_date } = dateRange(r.days)
    const qs = [
      start_date ? `start_date=${start_date}` : '',
      end_date   ? `end_date=${end_date}`     : '',
    ].filter(Boolean).join('&')
    const sep = qs ? '?' : ''
    const txnQs = [qs, 'limit=50'].filter(Boolean).join('&')
    const [s, subs, txns] = await Promise.all([
      api.get(`/transactions/summary${sep}${qs}`),
      api.get('/subscriptions/'),
      api.get(`/transactions/?${txnQs}`),
    ])
    setSummary(s)
    setSubscriptions(subs)
    setTransactions(txns)
  }

  useEffect(() => { load() }, [])

  const sync = async () => {
    setSyncing(true)
    await api.post('/transactions/sync')
    await api.post('/subscriptions/detect')
    await load()
    setSyncing(false)
  }

  const selectRange = (r) => {
    setRange(r)
    setSummary(null)
    load(r)
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  const avgMonthly = summary.by_month.length
    ? summary.total_spend / summary.by_month.length
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-slate-900 text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <button onClick={onHome} className="font-bold text-lg tracking-tight hover:text-slate-300 transition">
              Finance Tracker
            </button>
            <p className="text-slate-400 text-xs">Personal spending overview</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-2">
              {RANGES.map(r => (
                <button
                  key={r.label}
                  onClick={() => selectRange(r)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    range.label === r.label
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={onConnect}
              className="text-sm px-4 py-2 rounded-lg border border-slate-600 text-slate-300
                         hover:border-slate-400 hover:text-white transition"
            >
              + Connect Account
            </button>
            <button
              onClick={sync}
              disabled={syncing}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 font-medium
                         hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Spend"
            value={$(summary.total_spend)}
            sub={`across ${summary.by_month.length} month${summary.by_month.length !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="Active Subscriptions"
            value={subscriptions.length}
            sub={subscriptions.length > 0
              ? `${$(subscriptions.reduce((s, x) => s + x.amount, 0))} billed this cycle`
              : 'none detected yet'}
          />
          <StatCard
            label="Avg Monthly Spend"
            value={$(avgMonthly)}
            sub="based on transaction history"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CategoryChart data={summary.by_category} />
          <MonthlyChart data={summary.by_month} />
        </div>

        <SubscriptionList subscriptions={subscriptions} />
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  )
}
