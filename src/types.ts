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
  /**
   * Monthly spending limit for the "All accounts" view, in **base currency**
   * cents. 0 = no limit.
   */
  monthlyBudget: number
  /**
   * Per-account monthly limits: accountId → limit in **that account's own
   * currency** (cents). A missing/0 entry means the category is tracked but
   * uncapped while that account is the active one. Categories themselves stay
   * global — only the limit (and the spend shown) is per account.
   */
  budgets?: Record<string, number>
  archived: boolean
  createdAt: string
}

export type TxDirection = 'in' | 'out'

export interface Transaction {
  id: string
  accountId: string
  /**
   * Always a positive amount in cents, **in the account's own currency**;
   * `direction` gives the sign. When the user entered the transaction in a
   * different currency this is the converted value — see `originalAmount`.
   */
  amount: number
  direction: TxDirection
  /**
   * What the user actually typed, when they entered the amount in a currency
   * other than the account's: positive cents in `originalCurrency`. Kept for
   * display/audit only — every calculation uses `amount`, so changing an
   * exchange rate later never rewrites history.
   */
  originalAmount?: number
  /** ISO 4217 code the amount was entered in, when it differs from the account's. */
  originalCurrency?: string
  /**
   * Set when this transaction is one leg of an account-to-account transfer.
   * Both legs (the 'out' leg and the 'in' leg) share the same transferId.
   * Transfer legs are excluded from cash-flow and budget calculations.
   */
  transferId?: string
  /**
   * Set when this transaction exists only to reconcile the app's balance with
   * the account's real one (see "Adjust balance"). It moves the balance like
   * any other transaction, but — like a transfer leg — it is excluded from
   * cash-flow and budget maths: the amount is by definition unexplained, so
   * booking it as income or spend would invent a data point.
   */
  adjustment?: boolean
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
  /**
   * Currency every aggregate (net worth, cash flow, budgets) is expressed in.
   * Accounts keep their own currency; balances are converted using `rates`.
   */
  baseCurrency: string
  /**
   * Exchange rates into the base currency: 1 unit of currency X equals
   * `rates[X]` units of `baseCurrency`. The base itself needs no entry.
   * Edited manually or refreshed from the ECB (see rates.ts).
   */
  rates: Record<string, number>
  /** ISO timestamp of the last successful automatic rate refresh. */
  ratesUpdatedAt?: string
  /**
   * The account the app is currently scoped to — Overview, Activity and
   * Budgets show only this account, in its own currency. `null` (or an id
   * that no longer exists) means the combined "All accounts" view.
   */
  activeAccountId?: string | null
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
