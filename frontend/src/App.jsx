import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'

const API_BASE = 'http://localhost:8000'

export default function App() {
  const [linkToken, setLinkToken] = useState(null)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/plaid/link-token`, { method: 'POST' })
      .then(r => r.json())
      .then(data => setLinkToken(data.link_token))
      .catch(() => setStatus('Failed to reach backend — is it running?'))
  }, [])

  const onSuccess = useCallback(async (publicToken) => {
    setStatus('Exchanging token...')
    try {
      const res = await fetch(`${API_BASE}/plaid/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setConnected(true)
        setStatus(`Connected! Item ID: ${data.item_id}`)
      } else {
        setStatus(`Error: ${data.detail}`)
      }
    } catch {
      setStatus('Network error — check backend logs.')
    }
  }, [])

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Tracker</h1>
        <p className="text-gray-500 mb-8">Connect your bank account to get started.</p>

        {!connected ? (
          <button
            onClick={() => open()}
            disabled={!ready}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-lg
                       hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {linkToken ? 'Connect Bank Account' : 'Loading...'}
          </button>
        ) : (
          <div className="bg-green-50 text-green-700 rounded-xl py-4 font-semibold text-lg">
            Bank connected successfully!
          </div>
        )}

        {status && <p className="mt-4 text-sm text-gray-400">{status}</p>}
      </div>
    </div>
  )
}
