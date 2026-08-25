import { useState } from 'react'
import { newId, useStore } from '../store'
import { accountBalance } from '../selectors'
import { centsToInput, formatCents, parseAmountToCents } from '../money'
import { COMMON_CURRENCIES, currencyLabel } from '../rates'
import { BankIcon, CashIcon, ChartIcon, PlusIcon, TrashIcon } from './icons'
import { BalanceAdjustSheet } from './BalanceAdjust'
import type { Account, AccountKind } from '../types'

const KINDS: { value: AccountKind; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
]

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

export function Accounts() {
  const {
    accounts,
    transactions,
    activeAccount,
    setActiveAccount,
    saveAccount,
    removeAccount,
  } = useStore()
  const [editing, setEditing] = useState<Account | null>(null)
  const [adjusting, setAdjusting] = useState<Account | null>(null)

  return (
    <section>
      <header className="section-head" style={{ marginTop: 4 }}>
        <h1>Accounts</h1>
        <button
          className="add-btn"
          onClick={() =>
            setEditing({
              id: newId(),
              name: '',
              kind: 'bank',
              openingBalance: 0,
              currency: 'EUR',
              archived: false,
              createdAt: new Date().toISOString(),
            })
          }
        >
          <PlusIcon size={18} /> Add
        </button>
      </header>

      {accounts.length === 0 && (
        <div className="empty">No accounts yet. Add your first one.</div>
      )}

      {accounts.length > 0 && (
        <p className="muted small scope-note">
          Tap an account to edit it or correct its balance, or “View” to make
          it the one Overview, Activity and Budgets show.
        </p>
      )}

      <ul className="row-list">
        {accounts.map((a) => {
          const Icon = KIND_ICON[a.kind]
          const isActive = activeAccount?.id === a.id
          return (
            <li
              key={a.id}
              className={isActive ? 'row scope-active' : 'row'}
              onClick={() => setEditing(a)}
            >
              <span className={KIND_TILE[a.kind]}>
                <Icon size={22} />
              </span>
              <div className="row-body">
                <span className="row-title">{a.name}</span>
                <span className="row-meta">
                  {KIND_LABELS[a.kind]} · {a.currency}
                  {isActive ? ' · viewing' : ''}
                </span>
              </div>
              <span className="row-value">
                {formatCents(accountBalance(a, transactions), a.currency)}
              </span>
              <button
                className="row-action"
                onClick={(e) => {
                  e.stopPropagation()
                  void setActiveAccount(isActive ? null : a.id)
                }}
              >
                {isActive ? 'All' : 'View'}
              </button>
            </li>
          )
        })}
      </ul>

      {editing && (
        <AccountForm
          account={editing}
          balance={accountBalance(editing, transactions)}
          onAdjust={() => {
            const a = editing
            setEditing(null)
            setAdjusting(a)
          }}
          onClose={() => setEditing(null)}
          onSave={async (a) => {
            await saveAccount(a)
            setEditing(null)
          }}
          onDelete={async (id) => {
            await removeAccount(id)
            setEditing(null)
          }}
        />
      )}

      {adjusting && (
        <BalanceAdjustSheet
          account={adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </section>
  )
}

function AccountForm({
  account,
  balance,
  onAdjust,
  onClose,
  onSave,
  onDelete,
}: {
  account: Account
  /** Current balance, so an existing account can be reconciled from here. */
  balance: number
  onAdjust: () => void
  onClose: () => void
  onSave: (a: Account) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(account.name)
  const [kind, setKind] = useState<AccountKind>(account.kind)
  const [opening, setOpening] = useState(centsToInput(account.openingBalance))
  const [currency, setCurrency] = useState(account.currency)
  // A blank name is how a freshly created account arrives here.
  const isExisting = !!account.name

  function submit() {
    const cents = parseAmountToCents(opening) ?? 0
    onSave({ ...account, name: name.trim(), kind, openingBalance: cents, currency })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{isExisting ? 'Edit account' : 'New account'}</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {isExisting && (
          <div className="adjust-current">
            <span>Balance now</span>
            <strong>{formatCents(balance, currency)}</strong>
            <button className="row-action" onClick={onAdjust}>
              Adjust
            </button>
          </div>
        )}
        <label>
          Opening balance
          <input
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
          <span className="field-hint">
            What the account held before any transaction was logged. To fix a
            balance that has drifted, use “Adjust” above instead — it keeps
            the correction visible in Activity.
          </span>
        </label>
        <label>
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {!COMMON_CURRENCIES.includes(currency) && (
              <option value={currency}>{currencyLabel(currency)}</option>
            )}
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {currencyLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <div className="sheet-actions">
          {isExisting && (
            <button className="danger" onClick={() => onDelete(account.id)}>
              <TrashIcon size={16} /> Delete
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!name.trim()} onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
