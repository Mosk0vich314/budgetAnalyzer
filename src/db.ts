import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Account,
  AppSettings,
  BackupFile,
  Category,
  Transaction,
} from './types'
import { deriveCategories } from './migrate'

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
    indexes: { 'by-account': string; 'by-date': string; 'by-category': string }
  }
  categories: {
    key: string
    value: Category
  }
  settings: {
    key: string
    value: AppSettings & { id: string }
  }
}

const DB_NAME = 'budget-analyzer'
// v2: categories store + Transaction.categoryId. v3: settings store.
// v4: settings gain baseCurrency + rates (multi-currency).
const DB_VERSION = 4

const SETTINGS_KEY = 'app'
const DEFAULT_SETTINGS: AppSettings = {
  monthStartDay: 1,
  baseCurrency: 'EUR',
  rates: {},
}

let dbPromise: Promise<IDBPDatabase<BudgetDB>> | null = null

function getDB(): Promise<IDBPDatabase<BudgetDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BudgetDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore('accounts', { keyPath: 'id' })
          const txns = db.createObjectStore('transactions', { keyPath: 'id' })
          txns.createIndex('by-account', 'accountId')
          txns.createIndex('by-date', 'date')
        }
        if (oldVersion < 2) {
          db.createObjectStore('categories', { keyPath: 'id' })
          const txStore = tx.objectStore('transactions')
          txStore.createIndex('by-category', 'categoryId')
          // Backfill: turn distinct free-text categories into Category records
          // and stamp each transaction with its categoryId.
          const existing = await txStore.getAll()
          const { categories, transactions } = deriveCategories(existing)
          for (const c of categories) await tx.objectStore('categories').put(c)
          for (const t of transactions) await txStore.put(t)
        }
        if (oldVersion < 3) {
          db.createObjectStore('settings', { keyPath: 'id' })
          await tx
            .objectStore('settings')
            .put({ id: SETTINGS_KEY, ...DEFAULT_SETTINGS })
        }
        if (oldVersion >= 3 && oldVersion < 4) {
          // Backfill the new multi-currency settings fields.
          const store = tx.objectStore('settings')
          const rec = await store.get(SETTINGS_KEY)
          await store.put({ id: SETTINGS_KEY, ...DEFAULT_SETTINGS, ...rec })
        }
      },
    })
  }
  return dbPromise
}

export async function getSettings(): Promise<AppSettings> {
  const rec = await (await getDB()).get('settings', SETTINGS_KEY)
  if (!rec) return { ...DEFAULT_SETTINGS }
  const { id: _id, ...stored } = rec
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function putSettings(s: AppSettings): Promise<void> {
  await (await getDB()).put('settings', { id: SETTINGS_KEY, ...s })
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
  // Cascade: remove transactions belonging to the deleted account…
  const transferIds = new Set<string>()
  const index = tx.objectStore('transactions').index('by-account')
  for await (const cursor of index.iterate(id)) {
    if (cursor.value.transferId) transferIds.add(cursor.value.transferId)
    await cursor.delete()
  }
  // …and the partner legs of any transfers that touched it, so a transfer is
  // never left half-deleted on the surviving account.
  if (transferIds.size > 0) {
    for await (const cursor of tx.objectStore('transactions').iterate()) {
      if (cursor.value.transferId && transferIds.has(cursor.value.transferId)) {
        await cursor.delete()
      }
    }
  }
  await tx.done
}

export async function getCategories(): Promise<Category[]> {
  return (await getDB()).getAll('categories')
}

export async function putCategory(category: Category): Promise<void> {
  await (await getDB()).put('categories', category)
}

/**
 * Delete a category and orphan its transactions to "uncategorized" (clear
 * their categoryId). Unlike deleteAccount, this never deletes transactions —
 * removing a budget category must not erase spending history.
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'transactions'], 'readwrite')
  await tx.objectStore('categories').delete(id)
  const index = tx.objectStore('transactions').index('by-category')
  for await (const cursor of index.iterate(id)) {
    const next = { ...cursor.value }
    delete next.categoryId
    await cursor.update(next)
  }
  await tx.done
}

export async function getTransactions(): Promise<Transaction[]> {
  return (await getDB()).getAllFromIndex('transactions', 'by-date')
}

export async function putTransaction(t: Transaction): Promise<void> {
  await (await getDB()).put('transactions', t)
}

/** Write several transactions atomically (used for the two transfer legs). */
export async function putTransactions(ts: Transaction[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  for (const t of ts) await tx.objectStore('transactions').put(t)
  await tx.done
}

/**
 * Delete a transaction. If it is a transfer leg, the partner leg goes with it
 * — a half-deleted transfer would silently corrupt account balances.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  const store = tx.objectStore('transactions')
  const rec = await store.get(id)
  if (rec?.transferId) {
    const transferId = rec.transferId
    for await (const cursor of store.iterate()) {
      if (cursor.value.transferId === transferId) await cursor.delete()
    }
  } else {
    await store.delete(id)
  }
  await tx.done
}

/** Replace the entire database contents (used by import / restore). */
export async function replaceAll(data: BackupFile): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ['accounts', 'transactions', 'categories', 'settings'],
    'readwrite',
  )
  await tx.objectStore('accounts').clear()
  await tx.objectStore('transactions').clear()
  await tx.objectStore('categories').clear()
  for (const a of data.accounts) await tx.objectStore('accounts').put(a)
  for (const t of data.transactions) await tx.objectStore('transactions').put(t)
  for (const c of data.categories) await tx.objectStore('categories').put(c)
  await tx.objectStore('settings').put({ id: SETTINGS_KEY, ...data.settings })
  await tx.done
}
