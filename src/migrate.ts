// Backward-compatibility helper. Before v2, transactions carried a free-text
// `category` string and there were no Category records. This derives one
// Category per distinct non-empty string and backfills each transaction's
// `categoryId`, so upgrading the DB (db.ts) or importing an old backup
// (backup.ts) never loses the user's categories.
import type { Category, Transaction } from './types'

const DEFAULT_EMOJI = '🏷️'
// Cycle through tile colors so derived categories aren't all identical.
const PALETTE = ['denim', 'turq', 'grey', 'orange'] as const

export interface Derived {
  categories: Category[]
  transactions: Transaction[]
}

/**
 * Returns new category records and transactions with `categoryId` set.
 * Transactions that already have a `categoryId` are left untouched.
 */
export function deriveCategories(transactions: Transaction[]): Derived {
  const byName = new Map<string, Category>()
  const now = new Date().toISOString()
  let colorIdx = 0

  const migrated = transactions.map((t) => {
    if (t.categoryId) return t
    const name = (t.category ?? '').trim()
    if (!name) return t // stays uncategorized

    let cat = byName.get(name.toLowerCase())
    if (!cat) {
      cat = {
        id: crypto.randomUUID(),
        name,
        emoji: DEFAULT_EMOJI,
        color: PALETTE[colorIdx++ % PALETTE.length],
        monthlyBudget: 0,
        archived: false,
        createdAt: now,
      }
      byName.set(name.toLowerCase(), cat)
    }
    return { ...t, categoryId: cat.id }
  })

  return { categories: [...byName.values()], transactions: migrated }
}
