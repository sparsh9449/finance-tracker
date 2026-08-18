import { useState, useEffect } from 'react'
import { api } from './api'

function AccountCard({ item, onDisconnect, disconnecting }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      {item.accounts.map(acct => (
        <div key={acct.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center
                            text-indigo-600 font-bold text-sm flex-shrink-0">
              {acct.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{acct.name}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">
                {acct.subtype} · {acct.type}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDisconnect(item.item_id)}
            disabled={disconnecting === item.item_id}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition font-medium"
          >
            {disconnecting === item.item_id ? 'Removing...' : 'Disconnect'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function Home({ onDashboard, onConnect }) {
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [disconnecting, setDisconnecting] = useState(null)

  const load = async () => {
    const data = await api.get('/plaid/items')
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const disconnect = async (itemId) => {
    setDisconnecting(itemId)
    await api.delete(`/plaid/items/${itemId}`)
    await load()
    setDisconnecting(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="font-bold text-lg tracking-tight">Finance Tracker</h1>
          <p className="text-slate-400 text-xs">Personal spending overview</p>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="max-w-md">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-1">
              Manage your connected accounts or view your dashboard.
            </p>
          </div>

          {/* Connected accounts */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Connected Accounts
            </p>

            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-gray-400 text-sm">No accounts connected yet.</p>
                <p className="text-gray-300 text-xs mt-1">
                  Connect a bank account to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <AccountCard
                    key={item.item_id}
                    item={item}
                    onDisconnect={disconnect}
                    disconnecting={disconnecting}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onConnect}
              className="flex-1 border border-indigo-200 text-indigo-600 py-3 rounded-xl
                         text-sm font-semibold hover:bg-indigo-50 transition"
            >
              + Connect Account
            </button>
            {items.length > 0 && (
              <button
                onClick={onDashboard}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl
                           text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Go to Dashboard →
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
