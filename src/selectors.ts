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
  netWorth: number
  byKind: Record<Account['kind'], number>
}

/** Net worth and per-kind totals across all non-archived accounts. */
export function computeTotals(
  accounts: Account[],
  transactions: Transaction[],
): Totals {
  const byKind: Totals['byKind'] = { bank: 0, cash: 0, investment: 0 }
  let netWorth = 0
  for (const account of accounts) {
    if (account.archived) continue
    const balance = accountBalance(account, transactions)
    byKind[account.kind] += balance
    netWorth += balance
  }
  return { netWorth, byKind }
}

export interface MonthlyFlow {
  month: string // YYYY-MM
  in: number
  out: number
}

/** Sum money in/out per calendar month, most recent first. */
export function monthlyFlow(transactions: Transaction[]): MonthlyFlow[] {
  const map = new Map<string, MonthlyFlow>()
  for (const t of transactions) {
    const month = t.date.slice(0, 7)
    const entry = map.get(month) ?? { month, in: 0, out: 0 }
    if (t.direction === 'in') entry.in += t.amount
    else entry.out += t.amount
    map.set(month, entry)
  }
  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month))
}

/** Current month as YYYY-MM. */
export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

/** Whole days remaining in the calendar month of `now`, including today. */
export function daysLeftInMonth(now = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return last - now.getDate() + 1
}

export interface CategorySpend {
  category: Category
  budget: number // monthly limit in cents (0 = no limit)
  spent: number // outflow this month in cents
  remaining: number // budget - spent (can be negative)
  over: boolean
}

/**
 * Spend per category for a given month (outflows only). Categories with a
 * budget come first (and over-budget ones float to the top), then uncapped
 * categories ordered by spend.
 */
export function categorySpend(
  categories: Category[],
  transactions: Transaction[],
  month: string,
): CategorySpend[] {
  const spentBy = new Map<string, number>()
  for (const t of transactions) {
    if (t.direction !== 'out' || !t.categoryId) continue
    if (t.date.slice(0, 7) !== month) continue
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount)
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

/** Roll-up of all budgeted categories for the month: the "left this month" card. */
export function budgetSummary(
  categories: Category[],
  transactions: Transaction[],
  month: string,
  now = new Date(),
): BudgetSummary {
  const rows = categorySpend(categories, transactions, month)
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
    daysLeft: daysLeftInMonth(now),
  }
}
