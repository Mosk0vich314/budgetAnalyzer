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

/**
 * A spending category with an optional monthly budget. Budgets apply to
 * outflows only; `monthlyBudget` of 0 means "tracked, but no limit set".
 */
export interface Category {
  id: string
  name: string
  /** Single emoji used as the category's tile glyph. */
  emoji: string
  /** Tile color key — see TILE_COLORS in components. */
  color: string
  /** Monthly spending limit in cents. 0 = no limit. */
  monthlyBudget: number
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
  /** References a Category id; undefined = uncategorized. */
  categoryId?: string
  /**
   * Legacy free-text category, kept only so pre-v2 backups import cleanly.
   * New code reads `categoryId`; this is migrated into a Category on upgrade.
   */
  category?: string
  note: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  createdAt: string
}

/** App-wide preferences. */
export interface AppSettings {
  /**
   * Day of the month (1–28) the budget cycle begins. 1 = calendar month.
   * Capped at 28 so every month has the day.
   */
  monthStartDay: number
}

/** Shape of the JSON file produced by export / consumed by import. */
export interface BackupFile {
  app: 'budget-analyzer'
  version: number
  exportedAt: string
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  settings: AppSettings
}
