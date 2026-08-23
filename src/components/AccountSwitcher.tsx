import { useState } from 'react'
import { useStore } from '../store'
import { accountBalance, computeTotals } from '../selectors'
import { formatCents } from '../money'
import {
  BankIcon,
  CashIcon,
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
  WalletIcon,
} from './icons'
import type { Account, AccountKind } from '../types'

// The scope selector: a pill at the top of Overview / Activity / Budgets that
// says which account those screens are showing, and opens a sheet to switch.
// Selecting an account re-scopes the whole app to it (and to its currency);
// "All accounts" restores the combined, base-currency view.

const KIND_ICON = {
  bank: BankIcon,
  cash: CashIcon,
  investment: ChartIcon,
} satisfies Record<AccountKind, typeof BankIcon>

const KIND_TILE: Record<AccountKind, string> = {
  bank: 'tile',
  cash: 'tile turq',
  investment: 'tile grey',
}

const KIND_LABELS: Record<AccountKind, string> = {
  bank: 'Bank',
  cash: 'Cash',
  investment: 'Investment',
}

/** Up to two letters from the account name, for the pill's round badge. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function AccountSwitcher() {
  const { accounts, transactions, settings, activeAccount, setActiveAccount } =
    useStore()
  const [open, setOpen] = useState(false)

  const active = accounts.filter((a) => !a.archived)
  const totals = computeTotals(accounts, transactions, settings)

  const balance = activeAccount
    ? formatCents(accountBalance(activeAccount, transactions), activeAccount.currency)
    : formatCents(totals.netWorth, settings.baseCurrency)

  async function pick(id: string | null) {
    await setActiveAccount(id)
    setOpen(false)
  }

  return (
    <>
      <button className="scope-pill" onClick={() => setOpen(true)}>
        <span className={activeAccount ? 'scope-badge' : 'scope-badge all'}>
          {activeAccount ? initials(activeAccount.name) : <WalletIcon size={20} />}
        </span>
        <span className="scope-text">
          <span className="scope-label">Viewing</span>
          <span className="scope-name">
            {activeAccount ? activeAccount.name : 'All accounts'}
          </span>
        </span>
        <span className="scope-balance">{balance}</span>
        <ChevronDownIcon size={18} />
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Switch account</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Overview, Activity and Budgets follow this choice. Pick one
              account to work in its own currency, or see everything together in{' '}
              {settings.baseCurrency}.
            </p>

            <ul className="row-list scope-list">
              <li
                className={activeAccount ? 'row' : 'row scope-active'}
                onClick={() => void pick(null)}
              >
                <span className="tile grey">
                  <WalletIcon size={22} />
                </span>
                <div className="row-body">
                  <span className="row-title">All accounts</span>
                  <span className="row-meta">
                    {active.length} {active.length === 1 ? 'account' : 'accounts'} ·
                    combined in {settings.baseCurrency}
                  </span>
                </div>
                <span className="row-value">
                  {formatCents(totals.netWorth, settings.baseCurrency)}
                </span>
                {!activeAccount && (
                  <span className="scope-check">
                    <CheckIcon size={16} />
                  </span>
                )}
              </li>

              {accounts.map((a: Account) => {
                const Icon = KIND_ICON[a.kind]
                const isActive = activeAccount?.id === a.id
                return (
                  <li
                    key={a.id}
                    className={isActive ? 'row scope-active' : 'row'}
                    onClick={() => void pick(a.id)}
                  >
                    <span className={KIND_TILE[a.kind]}>
                      <Icon size={22} />
                    </span>
                    <div className="row-body">
                      <span className="row-title">{a.name}</span>
                      <span className="row-meta">
                        {KIND_LABELS[a.kind]} · {a.currency}
                        {a.archived ? ' · archived' : ''}
                      </span>
                    </div>
                    <span className="row-value">
                      {formatCents(accountBalance(a, transactions), a.currency)}
                    </span>
                    {isActive && (
                      <span className="scope-check">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>

            {accounts.length === 0 && (
              <div className="empty">
                No accounts yet — add one under the Accounts tab.
              </div>
            )}

            <div className="sheet-actions">
              <button onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
