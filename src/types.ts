// Core domain model for Budget Analyzer.
// All money values are stored as integer minor units (cents) to avoid
// floating-point rounding errors. Use the helpers in money.ts to format.

export type AccountKind = 'bank' | 'cash' | 'investment'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  /** Starting balance in cents, before any transactions are applied. */
  openingBalance: number
  currency: string
  archived: boolean
  createdAt: string
}

export type TxDirection = 'in' | 'out'

export interface Transaction {
  id: string
  accountId: string
  /** Always a positive amount in cents; `direction` gives the sign. */
  amount: number
  direction: TxDirection
  category: string
  note: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  createdAt: string
}

/** Shape of the JSON file produced by export / consumed by import. */
export interface BackupFile {
  app: 'budget-analyzer'
  version: number
  exportedAt: string
  accounts: Account[]
  transactions: Transaction[]
}
