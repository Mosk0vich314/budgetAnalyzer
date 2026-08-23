import { useState } from 'react'
import type { ComponentType } from 'react'
import { Dashboard } from './components/Dashboard'
import { Accounts } from './components/Accounts'
import { Transactions } from './components/Transactions'
import { Budgets } from './components/Budgets'
import { Settings } from './components/Settings'
import { AccountSwitcher } from './components/AccountSwitcher'
import {
  HomeIcon,
  WalletIcon,
  ActivityIcon,
  TargetIcon,
  GearIcon,
} from './components/icons'
import { useStore } from './store'

type Tab = 'dashboard' | 'accounts' | 'transactions' | 'budgets' | 'settings'

const TABS: { id: Tab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Overview', Icon: HomeIcon },
  { id: 'accounts', label: 'Accounts', Icon: WalletIcon },
  { id: 'transactions', label: 'Activity', Icon: ActivityIcon },
  { id: 'budgets', label: 'Budgets', Icon: TargetIcon },
  { id: 'settings', label: 'Settings', Icon: GearIcon },
]

/** Tabs that show one account at a time and so carry the scope switcher. */
const SCOPED_TABS: Tab[] = ['dashboard', 'transactions', 'budgets']

export function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { loading, accounts } = useStore()

  // Accounts and Settings manage everything at once, so they show no switcher.
  const showScope = !loading && accounts.length > 0 && SCOPED_TABS.includes(tab)

  return (
    <div className="app">
      {showScope && (
        <header className="scope-bar">
          <AccountSwitcher />
        </header>
      )}

      <main className={showScope ? 'content with-scope' : 'content'}>
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
