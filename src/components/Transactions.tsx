import { useState } from 'react'
import { newId, useStore } from '../store'
import { formatCents, parseAmountToCents, centsToInput } from '../money'
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, TrashIcon } from './icons'
import { tileClass } from './ui'
import type { Category, Transaction, TxDirection } from '../types'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Transactions() {
  const {
    accounts,
    transactions,
    categories,
    saveTransaction,
    removeTransaction,
    saveCategory,
  } = useStore()
  const [editing, setEditing] = useState<Transaction | null>(null)

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? '(deleted)'
  const categoryById = (id?: string) =>
    id ? categories.find((c) => c.id === id) : undefined

  function startNew() {
    if (accounts.length === 0) return
    setEditing({
      id: newId(),
      accountId: accounts[0].id,
      amount: 0,
      direction: 'out',
      categoryId: undefined,
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
          const cat = categoryById(t.categoryId)
          const title = cat?.name ?? (isIn ? 'Income' : 'Uncategorized')
          return (
            <li key={t.id} className="row" onClick={() => setEditing(t)}>
              <span className={cat ? tileClass(cat.color) : isIn ? 'tile in' : 'tile out'}>
                {cat ? (
                  <span className="emoji">{cat.emoji}</span>
                ) : isIn ? (
                  <ArrowUpIcon size={20} />
                ) : (
                  <ArrowDownIcon size={20} />
                )}
              </span>
              <div className="row-body">
                <span className="row-title">{title}</span>
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
          categories={categories}
          onCreateCategory={saveCategory}
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

const NEW_CATEGORY = '__new__'

function TransactionForm({
  tx,
  accounts,
  categories,
  onCreateCategory,
  onClose,
  onSave,
  onDelete,
}: {
  tx: Transaction
  accounts: { id: string; name: string }[]
  categories: Category[]
  onCreateCategory: (c: Category) => Promise<void>
  onClose: () => void
  onSave: (t: Transaction) => void
  onDelete: (id: string) => void
}) {
  const [direction, setDirection] = useState<TxDirection>(tx.direction)
  const [amount, setAmount] = useState(tx.amount ? centsToInput(tx.amount) : '')
  const [accountId, setAccountId] = useState(tx.accountId)
  const [categoryId, setCategoryId] = useState<string | undefined>(tx.categoryId)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [note, setNote] = useState(tx.note)
  const [date, setDate] = useState(tx.date)

  const cents = parseAmountToCents(amount)
  const valid = cents !== null && cents > 0

  function onPickCategory(value: string) {
    if (value === NEW_CATEGORY) {
      setCreating(true)
      setCategoryId(undefined)
    } else {
      setCreating(false)
      setCategoryId(value || undefined)
    }
  }

  async function addCategory() {
    const name = newName.trim()
    if (!name) return
    const id = newId()
    await onCreateCategory({
      id,
      name,
      emoji: '🏷️',
      color: 'denim',
      monthlyBudget: 0,
      archived: false,
      createdAt: new Date().toISOString(),
    })
    setCategoryId(id)
    setCreating(false)
    setNewName('')
  }

  function submit() {
    if (!valid) return
    onSave({
      ...tx,
      direction,
      amount: Math.abs(cents),
      accountId,
      categoryId,
      note: note.trim(),
      date,
    })
  }

  const isNew = tx.amount === 0 && !tx.categoryId

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
        <label>
          Category
          <select
            value={creating ? NEW_CATEGORY : (categoryId ?? '')}
            onChange={(e) => onPickCategory(e.target.value)}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>＋ New category…</option>
          </select>
        </label>
        {creating && (
          <div className="field-row">
            <label>
              New category name
              <input
                value={newName}
                autoFocus
                placeholder="e.g. Groceries"
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <button
              className="primary"
              style={{ alignSelf: 'flex-end' }}
              disabled={!newName.trim()}
              onClick={() => void addCategory()}
            >
              Add
            </button>
          </div>
        )}
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
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
