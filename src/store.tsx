import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as db from './db'
import type { Account, Transaction } from './types'

// A tiny app-wide store: it mirrors the IndexedDB contents in React state and
// re-reads after every mutation. The data set for a personal finance app is
// small, so reloading everything on change keeps the code simple and correct.

interface Store {
  accounts: Account[]
  transactions: Transaction[]
  loading: boolean
  reload: () => Promise<void>
  saveAccount: (account: Account) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  saveTransaction: (t: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [a, t] = await Promise.all([db.getAccounts(), db.getTransactions()])
    setAccounts(a.sort((x, y) => x.name.localeCompare(y.name)))
    setTransactions(t.sort((x, y) => y.date.localeCompare(x.date)))
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const saveAccount = useCallback(
    async (account: Account) => {
      await db.putAccount(account)
      await reload()
    },
    [reload],
  )

  const removeAccount = useCallback(
    async (id: string) => {
      await db.deleteAccount(id)
      await reload()
    },
    [reload],
  )

  const saveTransaction = useCallback(
    async (t: Transaction) => {
      await db.putTransaction(t)
      await reload()
    },
    [reload],
  )

  const removeTransaction = useCallback(
    async (id: string) => {
      await db.deleteTransaction(id)
      await reload()
    },
    [reload],
  )

  const value: Store = {
    accounts,
    transactions,
    loading,
    reload,
    saveAccount,
    removeAccount,
    saveTransaction,
    removeTransaction,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function newId(): string {
  return crypto.randomUUID()
}
