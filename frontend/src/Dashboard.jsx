import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { api } from './api'

const COLORS = ['#6366f1','#f97316','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#9ca3af']
const $  = (n) => `$${parseFloat(n).toFixed(2)}`
const fmtCat = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

function CategoryChart({ data }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-semibold text-gray-700 mb-4">Spend by Category</h2>
      {data.length === 0 ? (
        <p className="text-gray-400 text-sm">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="category"
              width={150}
              tickFormatter={fmtCat}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(v) => $(v)} labelFormatter={fmtCat} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function MonthlyChart({ data }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-semibold text-gray-700 mb-4">Monthly Spending</h2>
      {data.length === 0 ? (
        <p className="text-gray-400 text-sm">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => $(v)} />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function SubscriptionList({ subscriptions }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-semibold text-gray-700 mb-4">Detected Subscriptions</h2>
      {subscriptions.length === 0 ? (
        <p className="text-gray-400 text-sm">No recurring charges detected yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {subscriptions.map(s => (
            <li key={s.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{s.merchant_name}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {s.frequency} · last charged {s.last_charged}
                </p>
              </div>
              <span className="font-semibold text-gray-900">{$(s.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    const [s, subs] = await Promise.all([
      api.get('/transactions/summary'),
      api.get('/subscriptions/'),
    ])
    setSummary(s)
    setSubscriptions(subs)
  }

  useEffect(() => { load() }, [])

  const sync = async () => {
    setSyncing(true)
    await api.post('/transactions/sync')
    await api.post('/subscriptions/detect')
    await load()
    setSyncing(false)
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
            <p className="text-gray-500 text-sm mt-1">
              Total spend: <strong className="text-gray-800">{$(summary.total_spend)}</strong>
            </p>
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold
                       hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <CategoryChart data={summary.by_category} />
          <MonthlyChart data={summary.by_month} />
        </div>

        <SubscriptionList subscriptions={subscriptions} />
      </div>
    </div>
  )
}
