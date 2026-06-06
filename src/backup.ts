import { getAccounts, getTransactions, replaceAll } from './db'
import type { Account, BackupFile, Transaction } from './types'

const BACKUP_VERSION = 1

/** Build the backup object from current DB contents and trigger a download. */
export async function exportBackup(): Promise<void> {
  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactions(),
  ])
  const data: BackupFile = {
    app: 'budget-analyzer',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
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
  await replaceAll({
    app: 'budget-analyzer',
    version: parsed.version ?? BACKUP_VERSION,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    accounts: parsed.accounts as Account[],
    transactions: parsed.transactions as Transaction[],
  })
}
