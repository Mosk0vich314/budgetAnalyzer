import { useStore } from '../store'
import {
  accountBalance,
  budgetSummary,
  computeTotals,
  currentMonth,
  currentPeriod,
  monthlyFlow,
  scopedTransactions,
} from '../selectors'
import { formatCents } from '../money'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  BankIcon,
  CashIcon,
  ChartIcon,
  TransferIcon,
} from './icons'
import { tileClass } from './ui'
import type { AccountKind } from '../types'

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

/** Pretty month label, e.g. "2024-03" -> "March 2024". */
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function Dashboard() {
  const { accounts, transactions, categories, settings, activeAccount, scope } =
    useStore()
  // Every figure below is in the scope's currency: the account's own currency
  // when one is selected, the base currency for the combined view.
  const currency = scope.currency
  const totals = computeTotals(accounts, transactions, settings)
  const flow = monthlyFlow(transactions, accounts, settings, scope)

  const thisMonth = currentMonth()
  const current = flow.find((m) => m.month === thisMonth) ?? {
    month: thisMonth,
    in: 0,
    out: 0,
  }

  const period = currentPeriod(settings.monthStartDay)
  const budget = budgetSummary(
    categories,
    transactions,
    accounts,
    settings,
    period,
    scope,
  )
  const budgetPct =
    budget.totalBudget > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((budget.totalSpent / budget.totalBudget) * 100)),
        )
      : 0

  const active = accounts.filter((a) => !a.archived)
  const multiCurrency = new Set(active.map((a) => a.currency)).size > 1

  const balance = activeAccount
    ? accountBalance(activeAccount, transactions)
    : totals.netWorth

  const recent = activeAccount
    ? scopedTransactions(transactions, scope).slice(0, 5)
    : []

  return (
    <section>
      <div className="hero">
        <span className="hero-label">
          <span className="hero-dot" />
          {activeAccount ? 'Account balance' : 'Total balance'}
        </span>
        <p className="hero-balance">{formatCents(balance, currency)}</p>
        <span className="hero-sub">
          {activeAccount
            ? `${KIND_LABELS[activeAccount.kind]} · ${activeAccount.currency}`
            : `Across ${active.length} ${
                active.length === 1 ? 'account' : 'accounts'
              }${multiCurrency ? `, converted to ${currency}` : ''}`}
        </span>
      </div>

      {/* Only the combined view converts anything, so only it can be missing a rate. */}
      {!activeAccount && totals.missingRates.length > 0 && (
        <div className="warn-card">
          No exchange rate for {totals.missingRates.join(', ')} — those balances
          are counted 1:1. Set rates in the Settings tab.
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card dark">
          <div className="stat-top">
            <span className="stat-label">In this month</span>
            <span className="stat-badge">
              <ArrowUpIcon size={20} />
            </span>
          </div>
          <span className="stat-value">{formatCents(current.in, currency)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Out this month</span>
            <span className="stat-badge out">
              <ArrowDownIcon size={20} />
            </span>
          </div>
          <span className="stat-value">{formatCents(current.out, currency)}</span>
        </div>
      </div>

      {budget.totalBudget > 0 && (
        <div className="budget-mini">
          <div className="budget-mini-head">
            <span className="hero-label">
              <span className="hero-dot" />
              Left this month
            </span>
            <span className="budget-mini-amount">
              {formatCents(Math.max(0, budget.remaining), currency)}
            </span>
          </div>
          <div className="bar">
            <span
              className={budget.remaining < 0 ? 'bar-fill over' : 'bar-fill'}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <div className="budget-mini-foot">
            <span>{formatCents(budget.totalSpent, currency)} spent</span>
            <span>of {formatCents(budget.totalBudget, currency)}</span>
          </div>
        </div>
      )}

      {activeAccount ? (
        <>
          <div className="section-head">
            <h2>Recent activity</h2>
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              Nothing logged on {activeAccount.name} yet. Add it under Activity.
            </div>
          ) : (
            <ul className="row-list">
              {recent.map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId)
                const isIn = t.direction === 'in'
                const title = t.transferId
                  ? 'Transfer'
                  : (cat?.name ?? (isIn ? 'Income' : 'Uncategorized'))
                return (
                  <li key={t.id} className="row">
                    <span
                      className={
                        t.transferId
                          ? 'tile cream'
                          : cat
                            ? tileClass(cat.color)
                            : isIn
                              ? 'tile in'
                              : 'tile out'
                      }
                    >
                      {t.transferId ? (
                        <TransferIcon size={20} />
                      ) : cat ? (
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
                        {new Date(`${t.date}T00:00:00`).toLocaleDateString(
                          undefined,
                          { day: 'numeric', month: 'short' },
                        )}
                        {t.note ? ` · ${t.note}` : ''}
                      </span>
                    </div>
                    <span
                      className={
                        t.transferId
                          ? 'row-value muted'
                          : isIn
                            ? 'row-value amount-in'
                            : 'row-value amount-out'
                      }
                    >
                      {t.transferId ? '' : isIn ? '+' : '−'}
                      {formatCents(t.amount, currency)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="section-head">
            <h2>Accounts</h2>
          </div>
          {active.length === 0 ? (
            <div className="empty">
              No accounts yet. Add your first one under Accounts.
            </div>
          ) : (
            <ul className="row-list">
              {active.map((a) => {
                const Icon = KIND_ICON[a.kind]
                return (
                  <li key={a.id} className="row">
                    <span className={KIND_TILE[a.kind]}>
                      <Icon size={22} />
                    </span>
                    <div className="row-body">
                      <span className="row-title">{a.name}</span>
                      <span className="row-meta">{KIND_LABELS[a.kind]}</span>
                    </div>
                    <span className="row-value">
                      {formatCents(accountBalance(a, transactions), a.currency)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <div className="section-head">
        <h2>Recent months</h2>
      </div>
      {flow.length === 0 ? (
        <div className="empty">No transactions yet. Add some under Activity.</div>
      ) : (
        <ul className="flow-list">
          {flow.slice(0, 6).map((m) => (
            <li key={m.month} className="flow-row">
              <span className="flow-month">{monthLabel(m.month)}</span>
              <span className="flow-net">
                {formatCents(m.in - m.out, currency)}
              </span>
              <span className="flow-detail">
                <span className="amount-in">+{formatCents(m.in, currency)}</span>
                <span className="amount-out">−{formatCents(m.out, currency)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
