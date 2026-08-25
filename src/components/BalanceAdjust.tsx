import { useState } from 'react'
import { newId, useStore } from '../store'
import { accountBalance, balanceCorrection } from '../selectors'
import { centsToInput, formatCents, parseAmountToCents } from '../money'
import type { Account, Transaction } from '../types'

/**
 * Reconcile one account with reality: the user types the balance the bank
 * actually shows and the app books the difference as a correcting
 * transaction. It is a real, dated, deletable row rather than a silent edit of
 * `openingBalance`, so the correction stays auditable and nothing rewrites
 * history. Marked `adjustment: true`, which keeps it out of cash flow and
 * budgets — see `isFlow` in selectors.ts.
 */
export function BalanceAdjustSheet({
  account,
  onClose,
}: {
  account: Account
  onClose: () => void
}) {
  const { transactions, saveTransaction } = useStore()
  const current = accountBalance(account, transactions)

  const [actual, setActual] = useState(centsToInput(current))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const target = parseAmountToCents(actual)
  const correction = target === null ? null : balanceCorrection(current, target)

  async function submit() {
    if (!correction || saving) return
    setSaving(true)
    const t: Transaction = {
      id: newId(),
      accountId: account.id,
      amount: correction.amount,
      direction: correction.direction,
      adjustment: true,
      note: note.trim(),
      date,
      createdAt: new Date().toISOString(),
    }
    await saveTransaction(t)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Adjust balance</h2>
        <p className="muted small scope-note">
          Set {account.name} to the balance your bank actually shows. The
          difference is logged as a correction — it moves the balance but is
          left out of cash flow and budgets.
        </p>

        <div className="adjust-current">
          <span>In the app</span>
          <strong>{formatCents(current, account.currency)}</strong>
        </div>

        <label>
          Actual balance ({account.currency})
          <input
            inputMode="decimal"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoFocus
          />
        </label>

        <div
          className={
            correction ? `adjust-preview ${correction.direction}` : 'adjust-preview'
          }
        >
          {target === null
            ? 'Enter the balance your bank shows.'
            : correction === null
              ? 'Already matches — nothing to correct.'
              : `${correction.direction === 'in' ? 'Adds' : 'Removes'} ${formatCents(
                  correction.amount,
                  account.currency,
                )} ${correction.direction === 'in' ? 'to' : 'from'} ${account.name}.`}
        </div>

        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label>
          Note (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. missed cash spending"
          />
        </label>

        <div className="sheet-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!correction || saving}
            onClick={submit}
          >
            Save correction
          </button>
        </div>
      </div>
    </div>
  )
}
