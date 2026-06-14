import {
  getAccounts,
  getCategories,
  getSettings,
  getTransactions,
  replaceAll,
} from './db'
import { deriveCategories } from './migrate'
import type {
  Account,
  AppSettings,
  BackupFile,
  Category,
  Transaction,
} from './types'

// v2: backups include `categories`. v3: backups include `settings`. Older files
// import cleanly — missing categories are derived, missing settings default.
const BACKUP_VERSION = 3

/** Build the backup object from current DB contents and trigger a download. */
export async function exportBackup(): Promise<void> {
  const [accounts, transactions, categories, settings] = await Promise.all([
    getAccounts(),
    getTransactions(),
    getCategories(),
    getSettings(),
  ])
  const data: BackupFile = {
    app: 'budget-analyzer',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    settings,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Validate and restore a backup file, replacing all existing data. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Partial<BackupFile>
  if (parsed.app !== 'budget-analyzer') {
    throw new Error('Not a Budget Analyzer backup file.')
  }
  if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions)) {
    throw new Error('Backup file is missing accounts or transactions.')
  }

  const accounts = parsed.accounts as Account[]
  let transactions = parsed.transactions as Transaction[]
  let categories = (parsed.categories as Category[] | undefined) ?? []
  const settings: AppSettings = {
    monthStartDay: parsed.settings?.monthStartDay ?? 1,
  }

  // Pre-v2 backups have no categories — derive them from legacy strings.
  if (categories.length === 0 && transactions.some((t) => !t.categoryId)) {
    const derived = deriveCategories(transactions)
    categories = derived.categories
    transactions = derived.transactions
  }

  await replaceAll({
    app: 'budget-analyzer',
    version: parsed.version ?? BACKUP_VERSION,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    accounts,
    transactions,
    categories,
    settings,
  })
}
