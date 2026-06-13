import { useState } from 'react'
import { newId, useStore } from '../store'
import { formatCents, parseAmountToCents, centsToInput } from '../money'
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, TrashIcon } from './icons'
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
      <header className="section-head" style={{ marginTop: 4 }}>
        <h1>Activity</h1>
        <button className="add-btn" disabled={accounts.length === 0} onClick={startNew}>
          <PlusIcon size={18} /> Add
        </button>
      </header>

      {accounts.length === 0 && (
        <div className="empty">Create an account first, then log transactions here.</div>
      )}

      {accounts.length > 0 && transactions.length === 0 && (
        <div className="empty">No transactions yet. Tap “Add” to log one.</div>
      )}

      <ul className="row-list">
        {transactions.map((t) => {
          const isIn = t.direction === 'in'
          return (
            <li key={t.id} className="row" onClick={() => setEditing(t)}>
              <span className={isIn ? 'tile in' : 'tile out'}>
                {isIn ? <ArrowUpIcon size={20} /> : <ArrowDownIcon size={20} />}
              </span>
              <div className="row-body">
                <span className="row-title">{t.category || 'Uncategorized'}</span>
                <span className="row-meta">
                  {accountName(t.accountId)} · {t.date}
                </span>
              </div>
              <span className={isIn ? 'row-value amount-in' : 'row-value amount-out'}>
                {isIn ? '+' : '−'}
                {formatCents(t.amount)}
              </span>
            </li>
          )
        })}
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
            className={direction === 'out' ? 'seg active seg-out' : 'seg'}
            onClick={() => setDirection('out')}
          >
            Money out
          </button>
          <button
            className={direction === 'in' ? 'seg active seg-in' : 'seg'}
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
              <TrashIcon size={16} /> Delete
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
