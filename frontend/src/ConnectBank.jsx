import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { api } from './api'

export default function ConnectBank({ onConnected }) {
  const [linkToken, setLinkToken] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Tracker</h1>
        <p className="text-gray-500 mb-8">Connect your bank account to get started.</p>

        <button
          onClick={() => open()}
          disabled={!ready || loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-lg
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? status : linkToken ? 'Connect Bank Account' : 'Loading...'}
        </button>

        {!loading && status && (
          <p className="mt-4 text-sm text-gray-400">{status}</p>
        )}
      </div>
    </div>
  )
}
