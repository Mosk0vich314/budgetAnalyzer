import { useStore } from '../store'
import {
  accountBalance,
  budgetSummary,
  computeTotals,
  currentMonth,
  monthlyFlow,
} from '../selectors'
import { formatCents } from '../money'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  BankIcon,
  CashIcon,
  ChartIcon,
} from './icons'
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
  const { accounts, transactions, categories } = useStore()
  const totals = computeTotals(accounts, transactions)
  const flow = monthlyFlow(transactions)

  const thisMonth = currentMonth()
  const current = flow.find((m) => m.month === thisMonth) ?? {
    month: thisMonth,
    in: 0,
    out: 0,
  }

  const budget = budgetSummary(categories, transactions, thisMonth)
  const budgetPct =
    budget.totalBudget > 0
      ? Math.min(100, Math.round((budget.totalSpent / budget.totalBudget) * 100))
      : 0

  const active = accounts.filter((a) => !a.archived)

  return (
    <section>
      <header className="topbar">
        <div className="avatar">€</div>
        <div className="topbar-text">
          <span className="topbar-greeting">Welcome back</span>
          <span className="topbar-name">Overview</span>
        </div>
      </header>

      <div className="hero">
        <span className="hero-label">
          <span className="hero-dot" />
          Total balance
        </span>
        <p className="hero-balance">{formatCents(totals.netWorth)}</p>
        <span className="hero-sub">
          Across {active.length} {active.length === 1 ? 'account' : 'accounts'}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card dark">
          <div className="stat-top">
            <span className="stat-label">In this month</span>
            <span className="stat-badge">
              <ArrowUpIcon size={20} />
            </span>
          </div>
          <span className="stat-value">{formatCents(current.in)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Out this month</span>
            <span className="stat-badge out">
              <ArrowDownIcon size={20} />
            </span>
          </div>
          <span className="stat-value">{formatCents(current.out)}</span>
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
              {formatCents(Math.max(0, budget.remaining))}
            </span>
          </div>
          <div className="bar">
            <span
              className={budget.remaining < 0 ? 'bar-fill over' : 'bar-fill'}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <div className="budget-mini-foot">
            <span>{formatCents(budget.totalSpent)} spent</span>
            <span>of {formatCents(budget.totalBudget)}</span>
          </div>
        </div>
      )}

      <div className="section-head">
        <h2>Accounts</h2>
      </div>
      {active.length === 0 ? (
        <div className="empty">No accounts yet. Add your first one under Accounts.</div>
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
              <span className="flow-net">{formatCents(m.in - m.out)}</span>
              <span className="flow-detail">
                <span className="amount-in">+{formatCents(m.in)}</span>
                <span className="amount-out">−{formatCents(m.out)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
