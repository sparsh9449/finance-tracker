import { useState, useEffect } from 'react'
import ConnectBank from './ConnectBank'
import Dashboard from './Dashboard'
import { api } from './api'

export default function App() {
  const [view, setView] = useState('loading')

  useEffect(() => {
    api.get('/transactions/?limit=1')
      .then(data => setView(data.length > 0 ? 'dashboard' : 'connect'))
      .catch(() => setView('connect'))
  }, [])

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  if (view === 'connect') {
    return <ConnectBank onConnected={() => setView('dashboard')} />
  }

  return <Dashboard />
}
