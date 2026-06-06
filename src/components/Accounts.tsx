import { useState } from 'react'
import { newId, useStore } from '../store'
import { accountBalance } from '../selectors'
import { centsToInput, formatCents, parseAmountToCents } from '../money'
import type { Account, AccountKind } from '../types'

const KINDS: { value: AccountKind; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
]

export function Accounts() {
  const { accounts, transactions, saveAccount, removeAccount } = useStore()
  const [editing, setEditing] = useState<Account | null>(null)

  return (
    <section>
      <header className="page-head">
        <h1>Accounts</h1>
        <button
          className="primary"
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
          + Add
        </button>
      </header>

      {accounts.length === 0 && (
        <p className="muted">No accounts yet. Add your first one.</p>
      )}

      <ul className="list">
        {accounts.map((a) => (
          <li key={a.id} className="list-row" onClick={() => setEditing(a)}>
            <div>
              <span className="list-title">{a.name}</span>
              <span className="badge">{a.kind}</span>
            </div>
            <span className="list-value">
              {formatCents(accountBalance(a, transactions), a.currency)}
            </span>
          </li>
        ))}
      </ul>

      {editing && (
        <AccountForm
          account={editing}
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
    </section>
  )
}

function AccountForm({
  account,
  onClose,
  onSave,
  onDelete,
}: {
  account: Account
  onClose: () => void
  onSave: (a: Account) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(account.name)
  const [kind, setKind] = useState<AccountKind>(account.kind)
  const [balance, setBalance] = useState(centsToInput(account.openingBalance))
  const [currency, setCurrency] = useState(account.currency)

  function submit() {
    const opening = parseAmountToCents(balance) ?? 0
    onSave({ ...account, name: name.trim(), kind, openingBalance: opening, currency })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{account.name ? 'Edit account' : 'New account'}</h2>
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
        <div className="field-row">
          <label>
            Opening balance
            <input
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </label>
          <label className="currency-field">
            Currency
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </label>
        </div>
        <div className="sheet-actions">
          {account.name && (
            <button className="danger" onClick={() => onDelete(account.id)}>
              Delete
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
