import { useState } from 'react'
import Home from './Home'
import ConnectBank from './ConnectBank'
import Dashboard from './Dashboard'

export default function App() {
  const [view, setView] = useState('home')

  if (view === 'connect') {
    return <ConnectBank onConnected={() => setView('home')} />
  }
  if (view === 'dashboard') {
    return <Dashboard onHome={() => setView('home')} onConnect={() => setView('connect')} />
  }
  return <Home onDashboard={() => setView('dashboard')} onConnect={() => setView('connect')} />
}
