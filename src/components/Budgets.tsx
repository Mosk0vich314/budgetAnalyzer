import { useState } from 'react'
import { newId, useStore } from '../store'
import { budgetSummary, categorySpend, currentMonth } from '../selectors'
import { centsToInput, formatCents, parseAmountToCents } from '../money'
import { PlusIcon, TrashIcon } from './icons'
import { EMOJI_CHOICES, TILE_COLORS, tileClass } from './ui'
import type { Category } from '../types'

function pct(spent: number, budget: number): number {
  if (budget <= 0) return 0
  return Math.min(100, Math.round((spent / budget) * 100))
}

export function Budgets() {
  const { categories, transactions, saveCategory, removeCategory } = useStore()
  const [editing, setEditing] = useState<Category | null>(null)

  const month = currentMonth()
  const rows = categorySpend(categories, transactions, month)
  const summary = budgetSummary(categories, transactions, month)
  const hasBudgets = summary.totalBudget > 0

  function startNew() {
    setEditing({
      id: newId(),
      name: '',
      emoji: '🏷️',
      color: 'denim',
      monthlyBudget: 0,
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
          <p className="budget-hero-amount">{formatCents(Math.max(0, summary.remaining))}</p>
          <div className="bar bar-light">
            <span
              className={summary.remaining < 0 ? 'bar-fill over' : 'bar-fill'}
              style={{ width: `${pct(summary.totalSpent, summary.totalBudget)}%` }}
            />
          </div>
          <div className="budget-hero-foot">
            <span>{formatCents(summary.totalSpent)} spent</span>
            <span>{formatCents(summary.totalBudget)} budget</span>
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
                      {formatCents(spent)}
                      {budget > 0 ? ` of ${formatCents(budget)}` : ' spent'}
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
                        ? `${formatCents(-remaining)} over`
                        : `${formatCents(remaining)} left`}
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
    </section>
  )
}

function CategoryForm({
  category,
  onClose,
  onSave,
  onDelete,
}: {
  category: Category
  onClose: () => void
  onSave: (c: Category) => void
  onDelete: (id: string) => void
}) {
  const isNew = !category.name
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [color, setColor] = useState(category.color)
  const [budget, setBudget] = useState(
    category.monthlyBudget ? centsToInput(category.monthlyBudget) : '',
  )

  function submit() {
    const cents = parseAmountToCents(budget) ?? 0
    onSave({
      ...category,
      name: name.trim(),
      emoji,
      color,
      monthlyBudget: Math.max(0, cents),
    })
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
          Monthly budget (leave blank for no limit)
          <input
            inputMode="decimal"
            value={budget}
            placeholder="0.00"
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>

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
