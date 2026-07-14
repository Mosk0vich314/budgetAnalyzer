import { hasRate, toBaseCents, type RateContext } from './money'
import type { Account, Category, Transaction } from './types'

/** Net effect of a transaction on its account balance, in cents. */
export function signedAmount(t: Transaction): number {
  return t.direction === 'in' ? t.amount : -t.amount
}

/** Current balance of an account: opening balance + all its transactions. */
export function accountBalance(
  account: Account,
  transactions: Transaction[],
): number {
  return transactions
    .filter((t) => t.accountId === account.id)
    .reduce((sum, t) => sum + signedAmount(t), account.openingBalance)
}

export interface Totals {
  /** Net worth in the base currency (accounts converted via settings.rates). */
  netWorth: number
  byKind: Record<Account['kind'], number>
  /** Account currencies that lack an exchange rate (summed 1:1 as fallback). */
  missingRates: string[]
}

/** Net worth and per-kind totals across all non-archived accounts, in base currency. */
export function computeTotals(
  accounts: Account[],
  transactions: Transaction[],
  rates: RateContext,
): Totals {
  const byKind: Totals['byKind'] = { bank: 0, cash: 0, investment: 0 }
  const missing = new Set<string>()
  let netWorth = 0
  for (const account of accounts) {
    if (account.archived) continue
    if (!hasRate(account.currency, rates)) missing.add(account.currency)
    const balance = toBaseCents(
      accountBalance(account, transactions),
      account.currency,
      rates,
    )
    byKind[account.kind] += balance
    netWorth += balance
  }
  return { netWorth, byKind, missingRates: [...missing].sort() }
}

/** accountId → currency lookup for converting transaction amounts. */
function currencyByAccount(accounts: Account[]): Map<string, string> {
  return new Map(accounts.map((a) => [a.id, a.currency]))
}

/** Amount of a transaction expressed in base-currency cents. */
export function txBaseAmount(
  t: Transaction,
  currencies: Map<string, string>,
  rates: RateContext,
): number {
  const currency = currencies.get(t.accountId) ?? rates.baseCurrency
  return toBaseCents(t.amount, currency, rates)
}

export interface MonthlyFlow {
  month: string // YYYY-MM
  in: number
  out: number
}

/**
 * Sum money in/out per calendar month in base currency, most recent first.
 * Transfer legs are skipped — moving money between own accounts is not flow.
 */
export function monthlyFlow(
  transactions: Transaction[],
  accounts: Account[],
  rates: RateContext,
): MonthlyFlow[] {
  const currencies = currencyByAccount(accounts)
  const map = new Map<string, MonthlyFlow>()
  for (const t of transactions) {
    if (t.transferId) continue
    const month = t.date.slice(0, 7)
    const entry = map.get(month) ?? { month, in: 0, out: 0 }
    const amount = txBaseAmount(t, currencies, rates)
    if (t.direction === 'in') entry.in += amount
    else entry.out += amount
    map.set(month, entry)
  }
  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month))
}

/** Current month as YYYY-MM (used by the calendar-based cash-flow views). */
export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface Period {
  /** Inclusive start, YYYY-MM-DD. */
  start: string
  /** Exclusive end (next cycle's start), YYYY-MM-DD. */
  end: string
  /** Whole days remaining in the cycle, including today. */
  daysLeft: number
  /** Human label, e.g. "1 Jun – 30 Jun". */
  label: string
}

/**
 * The budget cycle containing `now`, starting on day `monthStartDay` (1–28).
 * With day 1 this is just the calendar month.
 */
export function currentPeriod(monthStartDay = 1, now = new Date()): Period {
  const day = Math.min(28, Math.max(1, Math.floor(monthStartDay)))
  const start = new Date(now.getFullYear(), now.getMonth(), day)
  if (now.getDate() < day) start.setMonth(start.getMonth() - 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysLeft = Math.round(
    (end.getTime() - startOfToday.getTime()) / 86_400_000,
  )
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return {
    start: ymd(start),
    end: ymd(end),
    daysLeft,
    label: `${fmt(start)} – ${fmt(lastDay)}`,
  }
}

export interface CategorySpend {
  category: Category
  budget: number // monthly limit in cents (0 = no limit)
  spent: number // net outflow this period in base-currency cents
  remaining: number // budget - spent (can be negative)
  over: boolean
}

/**
 * Net spend per category for a given budget period, in base currency.
 * Outflows add to a category's spend; money **in** assigned to the category
 * (refunds, reimbursements, cash-back) subtracts from it, giving the budget
 * room back. Transfer legs are ignored. Categories with a budget come first
 * (and over-budget ones float to the top), then uncapped categories by spend.
 */
export function categorySpend(
  categories: Category[],
  transactions: Transaction[],
  accounts: Account[],
  rates: RateContext,
  period: Period,
): CategorySpend[] {
  const currencies = currencyByAccount(accounts)
  const spentBy = new Map<string, number>()
  for (const t of transactions) {
    if (!t.categoryId || t.transferId) continue
    if (t.date < period.start || t.date >= period.end) continue
    const amount = txBaseAmount(t, currencies, rates)
    const delta = t.direction === 'out' ? amount : -amount
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + delta)
  }

  return categories
    .filter((c) => !c.archived)
    .map((category) => {
      const budget = category.monthlyBudget
      const spent = spentBy.get(category.id) ?? 0
      return {
        category,
        budget,
        spent,
        remaining: budget - spent,
        over: budget > 0 && spent > budget,
      }
    })
    .sort((a, b) => {
      // Budgeted before unbudgeted; within budgeted, over-budget first.
      if ((a.budget > 0) !== (b.budget > 0)) return a.budget > 0 ? -1 : 1
      if (a.over !== b.over) return a.over ? -1 : 1
      return b.spent - a.spent
    })
}

export interface BudgetSummary {
  totalBudget: number
  totalSpent: number // spend within budgeted categories only
  remaining: number
  daysLeft: number
}

/** Roll-up of all budgeted categories for the period: the "left this month" card. */
export function budgetSummary(
  categories: Category[],
  transactions: Transaction[],
  accounts: Account[],
  rates: RateContext,
  period: Period,
): BudgetSummary {
  const rows = categorySpend(categories, transactions, accounts, rates, period)
  let totalBudget = 0
  let totalSpent = 0
  for (const r of rows) {
    if (r.budget <= 0) continue // uncapped categories don't count toward the cap
    totalBudget += r.budget
    totalSpent += r.spent
  }
  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    daysLeft: period.daysLeft,
  }
}
