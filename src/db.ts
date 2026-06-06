import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Account, BackupFile, Transaction } from './types'

// IndexedDB is the single source of truth: all data lives on-device, no
// network. Backups happen via explicit JSON export/import (see backup.ts).

interface BudgetDB extends DBSchema {
  accounts: {
    key: string
    value: Account
  }
  transactions: {
    key: string
    value: Transaction
    indexes: { 'by-account': string; 'by-date': string }
  }
}

const DB_NAME = 'budget-analyzer'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<BudgetDB>> | null = null

function getDB(): Promise<IDBPDatabase<BudgetDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BudgetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('accounts', { keyPath: 'id' })
        const tx = db.createObjectStore('transactions', { keyPath: 'id' })
        tx.createIndex('by-account', 'accountId')
        tx.createIndex('by-date', 'date')
      },
    })
  }
  return dbPromise
}

export async function getAccounts(): Promise<Account[]> {
  return (await getDB()).getAll('accounts')
}

export async function putAccount(account: Account): Promise<void> {
  await (await getDB()).put('accounts', account)
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['accounts', 'transactions'], 'readwrite')
  await tx.objectStore('accounts').delete(id)
  // Cascade: remove transactions belonging to the deleted account.
  const index = tx.objectStore('transactions').index('by-account')
  for await (const cursor of index.iterate(id)) {
    await cursor.delete()
  }
  await tx.done
}

export async function getTransactions(): Promise<Transaction[]> {
  return (await getDB()).getAllFromIndex('transactions', 'by-date')
}

export async function putTransaction(t: Transaction): Promise<void> {
  await (await getDB()).put('transactions', t)
}

export async function deleteTransaction(id: string): Promise<void> {
  await (await getDB()).delete('transactions', id)
}

/** Replace the entire database contents (used by import / restore). */
export async function replaceAll(data: BackupFile): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['accounts', 'transactions'], 'readwrite')
  await tx.objectStore('accounts').clear()
  await tx.objectStore('transactions').clear()
  for (const a of data.accounts) await tx.objectStore('accounts').put(a)
  for (const t of data.transactions) await tx.objectStore('transactions').put(t)
  await tx.done
}
