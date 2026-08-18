import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { api } from './api'

export default function ConnectBank({ onConnected }) {
  const [linkToken, setLinkToken] = useState(null)
  const [status, setStatus]       = useState('')
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    api.post('/plaid/link-token')
      .then(data => setLinkToken(data.link_token))
      .catch(() => setStatus('Could not reach backend — is it running?'))
  }, [])

  const onSuccess = useCallback(async (publicToken) => {
    setLoading(true)
    setStatus('Connecting...')
    try {
      await api.post('/plaid/exchange-token', { public_token: publicToken })
      setStatus('Syncing transactions...')
      await api.post('/transactions/sync')
      await api.post('/subscriptions/detect')
      onConnected()
    } catch {
      setStatus('Something went wrong — check the backend logs.')
      setLoading(false)
    }
  }, [onConnected])

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="font-bold text-lg tracking-tight">Finance Tracker</h1>
          <p className="text-slate-400 text-xs">Personal spending overview</p>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect your bank</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Securely link your account via Plaid. Your credentials never touch our servers.
          </p>

          <button
            onClick={() => open()}
            disabled={!ready || loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold
                       hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? status : linkToken ? 'Connect Bank Account' : 'Loading...'}
          </button>

          {!loading && status && (
            <p className="mt-4 text-xs text-red-400">{status}</p>
          )}

          <p className="mt-6 text-xs text-gray-300">
            Powered by Plaid · Bank-level encryption
          </p>
        </div>
      </div>
    </div>
  )
}
