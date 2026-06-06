import { useState } from 'react'
import { newId, useStore } from '../store'
import { formatCents, parseAmountToCents, centsToInput } from '../money'
import type { Transaction, TxDirection } from '../types'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Transactions() {
  const { accounts, transactions, saveTransaction, removeTransaction } = useStore()
  const [editing, setEditing] = useState<Transaction | null>(null)

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? '(deleted)'

  function startNew() {
    if (accounts.length === 0) return
    setEditing({
      id: newId(),
      accountId: accounts[0].id,
      amount: 0,
      direction: 'out',
      category: '',
      note: '',
      date: todayISO(),
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <section>
      <header className="page-head">
        <h1>Activity</h1>
        <button className="primary" disabled={accounts.length === 0} onClick={startNew}>
          + Add
        </button>
      </header>

      {accounts.length === 0 && (
        <p className="muted">Create an account first, then log transactions here.</p>
      )}

      <ul className="list">
        {transactions.map((t) => (
          <li key={t.id} className="list-row" onClick={() => setEditing(t)}>
            <div>
              <span className="list-title">{t.category || '(uncategorized)'}</span>
              <span className="badge">{accountName(t.accountId)}</span>
              <span className="muted small">{t.date}</span>
            </div>
            <span className={t.direction === 'in' ? 'amount-in' : 'amount-out'}>
              {t.direction === 'in' ? '+' : '−'}
              {formatCents(t.amount)}
            </span>
          </li>
        ))}
      </ul>

      {editing && (
        <TransactionForm
          tx={editing}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onSave={async (t) => {
            await saveTransaction(t)
            setEditing(null)
          }}
          onDelete={async (id) => {
            await removeTransaction(id)
            setEditing(null)
          }}
        />
      )}
    </section>
  )
}

function TransactionForm({
  tx,
  accounts,
  onClose,
  onSave,
  onDelete,
}: {
  tx: Transaction
  accounts: { id: string; name: string }[]
  onClose: () => void
  onSave: (t: Transaction) => void
  onDelete: (id: string) => void
}) {
  const [direction, setDirection] = useState<TxDirection>(tx.direction)
  const [amount, setAmount] = useState(tx.amount ? centsToInput(tx.amount) : '')
  const [accountId, setAccountId] = useState(tx.accountId)
  const [category, setCategory] = useState(tx.category)
  const [note, setNote] = useState(tx.note)
  const [date, setDate] = useState(tx.date)

  const cents = parseAmountToCents(amount)
  const valid = cents !== null && cents > 0

  function submit() {
    if (!valid) return
    onSave({
      ...tx,
      direction,
      amount: Math.abs(cents),
      accountId,
      category: category.trim(),
      note: note.trim(),
      date,
    })
  }

  const isNew = tx.amount === 0 && !tx.category

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{isNew ? 'New transaction' : 'Edit transaction'}</h2>

        <div className="segmented">
          <button
            className={direction === 'out' ? 'seg active' : 'seg'}
            onClick={() => setDirection('out')}
          >
            Money out
          </button>
          <button
            className={direction === 'in' ? 'seg active' : 'seg'}
            onClick={() => setDirection('in')}
          >
            Money in
          </button>
        </div>

        <label>
          Amount
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Account
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row">
          <label>
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="sheet-actions">
          {!isNew && (
            <button className="danger" onClick={() => onDelete(tx.id)}>
              Delete
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!valid} onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
