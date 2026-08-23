import { useState } from 'react'
import { newId, useStore } from '../store'
import {
  budgetSummary,
  categoryBudget,
  categorySpend,
  currentPeriod,
  type Scope,
} from '../selectors'
import { centsToInput, formatCents, parseAmountToCents } from '../money'
import { PlusIcon, TrashIcon } from './icons'
import { EMOJI_CHOICES, TILE_COLORS, tileClass } from './ui'
import type { Account, AppSettings, Category } from '../types'

function pct(spent: number, budget: number): number {
  if (budget <= 0) return 0
  // Net spend can be negative when refunds exceed spending — clamp to 0.
  return Math.min(100, Math.max(0, Math.round((spent / budget) * 100)))
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

export function Budgets() {
  const {
    accounts,
    categories,
    transactions,
    settings,
    activeAccount,
    scope,
    saveCategory,
    removeCategory,
    saveSettings,
  } = useStore()
  const [editing, setEditing] = useState<Category | null>(null)
  const [cycleOpen, setCycleOpen] = useState(false)

  // Limits and spend are both in the scope's currency: the active account's
  // own currency, or the base currency for the combined view.
  const currency = scope.currency
  const period = currentPeriod(settings.monthStartDay)
  const rows = categorySpend(
    categories,
    transactions,
    accounts,
    settings,
    period,
    scope,
  )
  const summary = budgetSummary(
    categories,
    transactions,
    accounts,
    settings,
    period,
    scope,
  )
  const hasBudgets = summary.totalBudget > 0

  function startNew() {
    setEditing({
      id: newId(),
      name: '',
      emoji: '🏷️',
      color: 'denim',
      monthlyBudget: 0,
      budgets: {},
      archived: false,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <section>
      <header className="section-head" style={{ marginTop: 4 }}>
        <h1>Budgets</h1>
        <button className="add-btn" onClick={startNew}>
          <PlusIcon size={18} /> Category
        </button>
      </header>

      <button className="cycle-bar" onClick={() => setCycleOpen(true)}>
        <div>
          <span className="cycle-label">Budget cycle</span>
          <span className="cycle-range">{period.label}</span>
        </div>
        <span className="cycle-edit">
          Starts {ordinal(settings.monthStartDay)} ›
        </span>
      </button>

      <p className="muted small scope-note">
        {activeAccount
          ? `Limits and spend for ${activeAccount.name}, in ${currency}. Each account keeps its own limits — switch accounts at the top.`
          : `Limits and spend across every account, converted to ${currency}.`}
      </p>

      {hasBudgets && (
        <div className="budget-hero">
          <div className="budget-hero-top">
            <span className="hero-label" style={{ color: 'rgba(255,235,208,0.7)' }}>
              Left for {summary.daysLeft} {summary.daysLeft === 1 ? 'day' : 'days'}
            </span>
            <span className="budget-chip">
              {pct(summary.totalSpent, summary.totalBudget)}% used
            </span>
          </div>
          <p className="budget-hero-amount">
            {formatCents(Math.max(0, summary.remaining), currency)}
          </p>
          <div className="bar bar-light">
            <span
              className={summary.remaining < 0 ? 'bar-fill over' : 'bar-fill'}
              style={{ width: `${pct(summary.totalSpent, summary.totalBudget)}%` }}
            />
          </div>
          <div className="budget-hero-foot">
            <span>{formatCents(summary.totalSpent, currency)} spent</span>
            <span>{formatCents(summary.totalBudget, currency)} budget</span>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="empty">
          No categories yet. Add one and give it a monthly budget to start tracking
          your spending.
        </div>
      ) : (
        <>
          <div className="section-head">
            <h2>Categories</h2>
          </div>
          <ul className="row-list">
            {rows.map(({ category, budget, spent, remaining, over }) => (
              <li
                key={category.id}
                className="row budget-row"
                onClick={() => setEditing(category)}
              >
                <div className="budget-row-head">
                  <span className={tileClass(category.color)}>
                    <span className="emoji">{category.emoji}</span>
                  </span>
                  <div className="row-body">
                    <span className="row-title">{category.name}</span>
                    <span className="row-meta">
                      {formatCents(spent, currency)}
                      {budget > 0 ? ` of ${formatCents(budget, currency)}` : ' spent'}
                    </span>
                  </div>
                  <span
                    className={
                      budget <= 0
                        ? 'row-value muted'
                        : over
                          ? 'row-value amount-out'
                          : 'row-value amount-in'
                    }
                  >
                    {budget <= 0
                      ? 'No limit'
                      : over
                        ? `${formatCents(-remaining, currency)} over`
                        : `${formatCents(remaining, currency)} left`}
                  </span>
                </div>
                {budget > 0 && (
                  <div className="bar">
                    <span
                      className={over ? 'bar-fill over' : 'bar-fill'}
                      style={{ width: `${pct(spent, budget)}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <CategoryForm
          category={editing}
          scope={scope}
          account={activeAccount}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            await saveCategory(c)
            setEditing(null)
          }}
          onDelete={async (id) => {
            await removeCategory(id)
            setEditing(null)
          }}
        />
      )}

      {cycleOpen && (
        <CyclePicker
          settings={settings}
          onClose={() => setCycleOpen(false)}
          onSave={async (s) => {
            await saveSettings(s)
            setCycleOpen(false)
          }}
        />
      )}
    </section>
  )
}

function CyclePicker({
  settings,
  onClose,
  onSave,
}: {
  settings: AppSettings
  onClose: () => void
  onSave: (s: AppSettings) => void
}) {
  const [day, setDay] = useState(settings.monthStartDay)
  const days = Array.from({ length: 28 }, (_, i) => i + 1)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Budget cycle start</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Pick the day each budget month begins — e.g. your payday. Budgets and
          “left this month” are calculated from this day to the day before it next
          month.
        </p>
        <div className="day-grid">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className={d === day ? 'day-pick active' : 'day-pick'}
              onClick={() => setDay(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="sheet-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => onSave({ ...settings, monthStartDay: day })}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Edits a category. The name/icon/color are global, but the monthly limit
 * belongs to the current scope: editing while an account is active sets that
 * account's own limit, leaving every other account's untouched.
 */
function CategoryForm({
  category,
  scope,
  account,
  onClose,
  onSave,
  onDelete,
}: {
  category: Category
  scope: Scope
  account: Account | undefined
  onClose: () => void
  onSave: (c: Category) => void
  onDelete: (id: string) => void
}) {
  const isNew = !category.name
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [color, setColor] = useState(category.color)
  const scopedBudget = categoryBudget(category, scope)
  const [budget, setBudget] = useState(
    scopedBudget ? centsToInput(scopedBudget) : '',
  )

  /** Limits this category carries on the *other* accounts, for the hint line. */
  const otherAccountLimits = Object.entries(category.budgets ?? {}).filter(
    ([id, limit]) => id !== account?.id && limit > 0,
  ).length

  function submit() {
    const cents = Math.max(0, parseAmountToCents(budget) ?? 0)
    const next: Category = {
      ...category,
      name: name.trim(),
      emoji,
      color,
    }
    if (account) {
      next.budgets = { ...category.budgets, [account.id]: cents }
    } else {
      next.monthlyBudget = cents
    }
    onSave(next)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{isNew ? 'New category' : 'Edit category'}</h2>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <label>
          Icon
          <div className="emoji-grid">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                className={e === emoji ? 'emoji-pick active' : 'emoji-pick'}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </label>

        <label>
          Color
          <div className="color-row">
            {TILE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${tileClass(c)} swatch${c === color ? ' active' : ''}`}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </label>

        <label>
          {account
            ? `Monthly budget on ${account.name}, in ${scope.currency}`
            : `Monthly budget across all accounts, in ${scope.currency}`}{' '}
          (leave blank for no limit)
          <input
            inputMode="decimal"
            value={budget}
            placeholder="0.00"
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        {account && (
          <p className="muted small" style={{ margin: 0 }}>
            This limit applies to {account.name} only
            {otherAccountLimits > 0
              ? ` — the category also has a limit on ${otherAccountLimits} other ${
                  otherAccountLimits === 1 ? 'account' : 'accounts'
                }.`
              : '. Switch accounts to set a different one there.'}
          </p>
        )}

        <div className="sheet-actions">
          {!isNew && (
            <button className="danger" onClick={() => onDelete(category.id)}>
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
