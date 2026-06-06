import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Accounts } from './components/Accounts'
import { Transactions } from './components/Transactions'
import { Settings } from './components/Settings'
import { useStore } from './store'

type Tab = 'dashboard' | 'accounts' | 'transactions' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Overview', icon: '◎' },
  { id: 'accounts', label: 'Accounts', icon: '▤' },
  { id: 'transactions', label: 'Activity', icon: '⇅' },
  { id: 'settings', label: 'Backup', icon: '⤓' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { loading } = useStore()

  return (
    <div className="app">
      <main className="content">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'accounts' && <Accounts />}
            {tab === 'transactions' && <Transactions />}
            {tab === 'settings' && <Settings />}
          </>
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
