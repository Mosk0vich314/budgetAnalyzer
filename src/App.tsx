import { useState } from 'react'
import type { ComponentType } from 'react'
import { Dashboard } from './components/Dashboard'
import { Accounts } from './components/Accounts'
import { Transactions } from './components/Transactions'
import { Budgets } from './components/Budgets'
import { Settings } from './components/Settings'
import {
  HomeIcon,
  WalletIcon,
  ActivityIcon,
  TargetIcon,
  BackupIcon,
} from './components/icons'
import { useStore } from './store'

type Tab = 'dashboard' | 'accounts' | 'transactions' | 'budgets' | 'settings'

const TABS: { id: Tab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Overview', Icon: HomeIcon },
  { id: 'accounts', label: 'Accounts', Icon: WalletIcon },
  { id: 'transactions', label: 'Activity', Icon: ActivityIcon },
  { id: 'budgets', label: 'Budgets', Icon: TargetIcon },
  { id: 'settings', label: 'Backup', Icon: BackupIcon },
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
            {tab === 'budgets' && <Budgets />}
            {tab === 'settings' && <Settings />}
          </>
        )}
      </main>

      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={id === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(id)}
          >
            <Icon size={21} />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
