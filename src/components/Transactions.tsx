import { useMemo, useState } from 'react'
import { newId, useStore } from '../store'
import {
  centsToInput,
  convertCents,
  formatCents,
  parseAmountToCents,
} from '../money'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  SearchIcon,
  TransferIcon,
  TrashIcon,
} from './icons'
import { tileClass } from './ui'
import type {
  Account,
  AppSettings,
  Category,
  Transaction,
  TxDirection,
} from '../types'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** "Today" / "Yesterday" / localized date for the Activity group headers. */
function dateLabel(iso: string): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (iso === todayISO()) return 'Today'
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Yesterday'
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** One Activity row: a plain transaction, or a transfer represented by its legs. */
interface Entry {
  key: string
  date: string
  tx: Transaction
  /** The other leg when this entry is a transfer. */
  partner?: Transaction
}

type DirectionFilter = 'all' | TxDirection | 'transfer'

export function Transactions() {
  const {
    accounts,
    transactions,
    categories,
    settings,
    saveTransaction,
    saveTransactions,
    removeTransaction,
    saveCategory,
  } = useStore()
  const [editing, setEditing] = useState<{ tx: Transaction; isNew: boolean } | null>(
    null,
  )
  const [query, setQuery] = useState('')
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all')
  const [accountFilter, setAccountFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  )
  const accountName = (id: string) => accountById.get(id)?.name ?? '(deleted)'
  const accountCurrency = (id: string) =>
    accountById.get(id)?.currency ?? settings.baseCurrency
  const categoryById = (id?: string) =>
    id ? categories.find((c) => c.id === id) : undefined

  // Collapse transfer legs into single entries (represented by the out leg).
  const entries = useMemo<Entry[]>(() => {
    const legs = new Map<string, Transaction[]>()
    for (const t of transactions) {
      if (!t.transferId) continue
      const list = legs.get(t.transferId) ?? []
      list.push(t)
      legs.set(t.transferId, list)
    }
    const out: Entry[] = []
    for (const t of transactions) {
      if (t.transferId) {
        const pair = legs.get(t.transferId) ?? []
        const outLeg = pair.find((l) => l.direction === 'out')
        // The out leg represents the transfer; an orphan in-leg (only possible
        // via odd imports) still gets its own row so it is never invisible.
        if (outLeg && t.direction === 'in') continue
        out.push({
          key: t.id,
          date: t.date,
          tx: t,
          partner: pair.find((l) => l.id !== t.id),
        })
      } else {
        out.push({ key: t.id, date: t.date, tx: t })
      }
    }
    return out
  }, [transactions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(({ tx, partner }) => {
      const isTransfer = !!tx.transferId
      if (dirFilter === 'transfer' && !isTransfer) return false
      if ((dirFilter === 'in' || dirFilter === 'out') &&
        (isTransfer || tx.direction !== dirFilter))
        return false
      if (
        accountFilter &&
        tx.accountId !== accountFilter &&
        partner?.accountId !== accountFilter
      )
        return false
      if (categoryFilter === 'none' && (tx.categoryId || isTransfer)) return false
      if (categoryFilter && categoryFilter !== 'none' && tx.categoryId !== categoryFilter)
        return false
      if (q) {
        const cat = categoryById(tx.categoryId)
        const haystack = [
          tx.note,
          cat?.name ?? '',
          accountName(tx.accountId),
          partner ? accountName(partner.accountId) : '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [entries, query, dirFilter, accountFilter, categoryFilter, accounts, categories])

  const hasFilters =
    query.trim() !== '' || dirFilter !== 'all' || accountFilter !== '' || categoryFilter !== ''

  // Group by date (entries are already sorted date-desc by the store).
  const groups = useMemo(() => {
    const out: { date: string; items: Entry[] }[] = []
    for (const e of filtered) {
      const last = out[out.length - 1]
      if (last && last.date === e.date) last.items.push(e)
      else out.push({ date: e.date, items: [e] })
    }
    return out
  }, [filtered])

  function startNew() {
    if (accounts.length === 0) return
    setEditing({
      isNew: true,
      tx: {
        id: newId(),
        accountId: accounts[0].id,
        amount: 0,
        direction: 'out',
        categoryId: undefined,
        note: '',
        date: todayISO(),
        createdAt: new Date().toISOString(),
      },
    })
  }

  function openEntry(e: Entry) {
    // Always hand the form the out leg of a transfer so from/to line up.
    if (e.tx.transferId && e.tx.direction === 'in' && e.partner) {
      setEditing({ isNew: false, tx: e.partner })
    } else {
      setEditing({ isNew: false, tx: e.tx })
    }
  }

  const editingPartner = editing?.tx.transferId
    ? transactions.find(
        (t) => t.transferId === editing.tx.transferId && t.id !== editing.tx.id,
      )
    : undefined

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

      {accounts.length > 0 && (
        <>
          <div className="search-box">
            <SearchIcon size={17} />
            <input
              type="search"
              placeholder="Search notes, categories, accounts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="filter-row">
            <select
              className="filter-select"
              value={dirFilter}
              onChange={(e) => setDirFilter(e.target.value as DirectionFilter)}
            >
              <option value="all">All types</option>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
              <option value="transfer">Transfers</option>
            </select>
            <select
              className="filter-select"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              <option value="none">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {accounts.length > 0 && transactions.length === 0 && (
        <div className="empty">No transactions yet. Tap “Add” to log one.</div>
      )}
      {transactions.length > 0 && filtered.length === 0 && (
        <div className="empty">Nothing matches these filters.</div>
      )}

      {hasFilters && filtered.length > 0 && (
        <div className="filter-count">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.date}>
          <div className="group-head">{dateLabel(g.date)}</div>
          <ul className="row-list">
            {g.items.map((e) => {
              const t = e.tx
              if (t.transferId) {
                const from = t.direction === 'out' ? t : e.partner
                const to = t.direction === 'in' ? t : e.partner
                const crossCurrency =
                  from && to && accountCurrency(from.accountId) !== accountCurrency(to.accountId)
                return (
                  <li key={e.key} className="row" onClick={() => openEntry(e)}>
                    <span className="tile cream">
                      <TransferIcon size={20} />
                    </span>
                    <div className="row-body">
                      <span className="row-title">
                        {from ? accountName(from.accountId) : '?'} →{' '}
                        {to ? accountName(to.accountId) : '?'}
                      </span>
                      <span className="row-meta">
                        Transfer{t.note ? ` · ${t.note}` : ''}
                        {crossCurrency && to
                          ? ` · ${formatCents(to.amount, accountCurrency(to.accountId))} received`
                          : ''}
                      </span>
                    </div>
                    <span className="row-value muted">
                      {formatCents(
                        (from ?? t).amount,
                        accountCurrency((from ?? t).accountId),
                      )}
                    </span>
                  </li>
                )
              }
              const isIn = t.direction === 'in'
              const cat = categoryById(t.categoryId)
              const title = cat?.name ?? (isIn ? 'Income' : 'Uncategorized')
              return (
                <li key={e.key} className="row" onClick={() => openEntry(e)}>
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
                      {accountName(t.accountId)}
                      {t.note ? ` · ${t.note}` : ''}
                    </span>
                  </div>
                  <span className={isIn ? 'row-value amount-in' : 'row-value amount-out'}>
                    {isIn ? '+' : '−'}
                    {formatCents(t.amount, accountCurrency(t.accountId))}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {editing && (
        <TransactionForm
          tx={editing.tx}
          partner={editingPartner}
          isNew={editing.isNew}
          accounts={accounts}
          categories={categories}
          settings={settings}
          onCreateCategory={saveCategory}
          onClose={() => setEditing(null)}
          onSave={async (t) => {
            await saveTransaction(t)
            setEditing(null)
          }}
          onSaveTransfer={async (legs) => {
            await saveTransactions(legs)
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

type Mode = TxDirection | 'transfer'

function TransactionForm({
  tx,
  partner,
  isNew,
  accounts,
  categories,
  settings,
  onCreateCategory,
  onClose,
  onSave,
  onSaveTransfer,
  onDelete,
}: {
  tx: Transaction
  partner?: Transaction
  isNew: boolean
  accounts: Account[]
  categories: Category[]
  settings: AppSettings
  onCreateCategory: (c: Category) => Promise<void>
  onClose: () => void
  onSave: (t: Transaction) => void
  onSaveTransfer: (legs: Transaction[]) => void
  onDelete: (id: string) => void
}) {
  const isTransfer = !!tx.transferId
  const [mode, setMode] = useState<Mode>(isTransfer ? 'transfer' : tx.direction)
  const [amount, setAmount] = useState(tx.amount ? centsToInput(tx.amount) : '')
  const [accountId, setAccountId] = useState(tx.accountId)
  const [toAccountId, setToAccountId] = useState(
    partner?.accountId ?? accounts.find((a) => a.id !== tx.accountId)?.id ?? '',
  )
  const [received, setReceived] = useState(
    partner ? centsToInput(partner.amount) : '',
  )
  const [categoryId, setCategoryId] = useState<string | undefined>(tx.categoryId)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [note, setNote] = useState(tx.note)
  const [date, setDate] = useState(tx.date)

  const currencyOf = (id: string) =>
    accounts.find((a) => a.id === id)?.currency ?? settings.baseCurrency
  const fromCurrency = currencyOf(accountId)
  const toCurrency = toAccountId ? currencyOf(toAccountId) : fromCurrency
  const crossCurrency = mode === 'transfer' && fromCurrency !== toCurrency

  const cents = parseAmountToCents(amount)
  const receivedCents = parseAmountToCents(received)
  const amountValid = cents !== null && cents > 0
  const valid =
    mode === 'transfer'
      ? amountValid && !!toAccountId && toAccountId !== accountId
      : amountValid

  const convertedHint =
    crossCurrency && amountValid
      ? convertCents(cents, fromCurrency, toCurrency, settings)
      : null

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
    if (!valid || cents === null) return
    const abs = Math.abs(cents)
    if (mode === 'transfer') {
      const transferId = tx.transferId ?? newId()
      const inAmount = crossCurrency
        ? receivedCents && receivedCents > 0
          ? Math.abs(receivedCents)
          : convertCents(abs, fromCurrency, toCurrency, settings)
        : abs
      const trimmed = note.trim()
      const outLeg: Transaction = {
        id: tx.direction === 'out' || !tx.transferId ? tx.id : partner?.id ?? newId(),
        accountId,
        amount: abs,
        direction: 'out',
        transferId,
        note: trimmed,
        date,
        createdAt: tx.createdAt,
      }
      const inLeg: Transaction = {
        id:
          tx.direction === 'in' && tx.transferId
            ? tx.id
            : partner?.id ?? newId(),
        accountId: toAccountId,
        amount: inAmount,
        direction: 'in',
        transferId,
        note: trimmed,
        date,
        createdAt: partner?.createdAt ?? tx.createdAt,
      }
      onSaveTransfer([outLeg, inLeg])
      return
    }
    onSave({
      ...tx,
      direction: mode,
      amount: abs,
      accountId,
      categoryId,
      transferId: undefined,
      note: note.trim(),
      date,
    })
  }

  const canTransfer = accounts.length >= 2
  // Existing rows keep their shape: a transfer stays a transfer, a plain
  // transaction can only flip in/out.
  const showTransferSeg = isNew || isTransfer
  const lockTransfer = !isNew && isTransfer

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>
          {isNew
            ? 'New transaction'
            : mode === 'transfer'
              ? 'Edit transfer'
              : 'Edit transaction'}
        </h2>

        <div className="segmented">
          <button
            className={mode === 'out' ? 'seg active seg-out' : 'seg'}
            disabled={lockTransfer}
            onClick={() => setMode('out')}
          >
            Money out
          </button>
          <button
            className={mode === 'in' ? 'seg active seg-in' : 'seg'}
            disabled={lockTransfer}
            onClick={() => setMode('in')}
          >
            Money in
          </button>
          {showTransferSeg && (
            <button
              className={mode === 'transfer' ? 'seg active' : 'seg'}
              disabled={!canTransfer}
              onClick={() => setMode('transfer')}
            >
              Transfer
            </button>
          )}
        </div>

        <label>
          Amount ({fromCurrency})
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>

        <label>
          {mode === 'transfer' ? 'From account' : 'Account'}
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>

        {mode === 'transfer' && (
          <>
            <label>
              To account
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
              >
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
              </select>
            </label>
            {crossCurrency && (
              <label>
                Amount received ({toCurrency})
                <input
                  inputMode="decimal"
                  value={received}
                  placeholder={
                    convertedHint !== null ? centsToInput(convertedHint) : '0.00'
                  }
                  onChange={(e) => setReceived(e.target.value)}
                />
              </label>
            )}
          </>
        )}

        {mode !== 'transfer' && (
          <>
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
            {mode === 'in' && categoryId && (
              <p className="muted small" style={{ margin: 0 }}>
                Money in with a category counts back into that category’s budget
                (e.g. a refund).
              </p>
            )}
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
          </>
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
