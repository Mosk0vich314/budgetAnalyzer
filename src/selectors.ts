import type { Account, Transaction } from './types'

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
