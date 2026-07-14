import { useMemo, useRef, useState } from 'react'
import { exportBackup, importBackup } from '../backup'
import { useStore } from '../store'
import {
  COMMON_CURRENCIES,
  currencyLabel,
  fetchRates,
  rebaseRates,
} from '../rates'
import { RefreshIcon } from './icons'

export function Settings() {
  const { accounts, transactions, settings, saveSettings, reload } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [rateMessage, setRateMessage] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  // Rates are edited as strings and persisted per field on blur.
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({})

  const base = settings.baseCurrency

  /** Currencies that need a rate: every non-base currency an account uses. */
  const foreignCurrencies = useMemo(() => {
    const used = new Set(accounts.map((a) => a.currency))
    used.delete(base)
    return [...used].sort()
  }, [accounts, base])

  const baseOptions = useMemo(() => {
    const set = new Set([...accounts.map((a) => a.currency), ...COMMON_CURRENCIES])
    return [...set].sort()
  }, [accounts])

  async function changeBase(newBase: string) {
    if (newBase === base) return
    setRateMessage(null)
    // Keep existing rates meaningful by re-expressing them against the new base.
    const rates = rebaseRates(settings.rates, base, newBase)
    await saveSettings({ ...settings, baseCurrency: newBase, rates })
    setRateDrafts({})
    if (Object.keys(rates).length === 0 && foreignCurrencies.length > 0) {
      setRateMessage('Base changed — refresh or re-enter your exchange rates.')
    }
  }

  function draftFor(cur: string): string {
    if (rateDrafts[cur] !== undefined) return rateDrafts[cur]
    const rate = settings.rates[cur]
    return rate > 0 ? String(rate) : ''
  }

  async function commitRate(cur: string) {
    const raw = rateDrafts[cur]
    if (raw === undefined) return
    const value = Number(raw.replace(',', '.'))
    const rates = { ...settings.rates }
    if (value > 0) rates[cur] = value
    else delete rates[cur]
    await saveSettings({ ...settings, rates })
    setRateDrafts((d) => {
      const { [cur]: _done, ...rest } = d
      return rest
    })
  }

  async function refreshRates() {
    setFetching(true)
    setRateMessage(null)
    try {
      const { rates, date } = await fetchRates(base, foreignCurrencies)
      const found = Object.keys(rates)
      if (found.length === 0) {
        setRateMessage(
          'No automatic rates found for your currencies — enter them manually.',
        )
        return
      }
      await saveSettings({
        ...settings,
        rates: { ...settings.rates, ...rates },
        ratesUpdatedAt: new Date().toISOString(),
      })
      setRateDrafts({})
      const missed = foreignCurrencies.filter((c) => !found.includes(c))
      setRateMessage(
        `Rates updated (ECB, ${date})` +
          (missed.length ? ` — no rate for ${missed.join(', ')}.` : '.'),
      )
    } catch (err) {
      setRateMessage(err instanceof Error ? err.message : 'Rate update failed.')
    } finally {
      setFetching(false)
    }
  }

  async function onFile(file: File) {
    setMessage(null)
    try {
      if (
        !confirm(
          'Importing replaces ALL current data with the backup. Continue?',
        )
      ) {
        return
      }
      await importBackup(file)
      await reload()
      setMessage('Backup restored.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  return (
    <section>
      <header className="section-head" style={{ marginTop: 4 }}>
        <h1>Settings</h1>
      </header>

      <div className="section-head">
        <h2>Currency</h2>
      </div>
      <div className="card">
        <label>
          Base currency (totals, cash flow and budgets)
          <select value={base} onChange={(e) => void changeBase(e.target.value)}>
            {baseOptions.map((c) => (
              <option key={c} value={c}>
                {currencyLabel(c)}
              </option>
            ))}
          </select>
        </label>

        {foreignCurrencies.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            All your accounts are in {base}. Exchange rates appear here once an
            account uses another currency.
          </p>
        ) : (
          <>
            {foreignCurrencies.map((cur) => (
              <label key={cur} className="rate-row">
                <span className="rate-label">1 {cur} =</span>
                <input
                  inputMode="decimal"
                  placeholder="rate"
                  value={draftFor(cur)}
                  onChange={(e) =>
                    setRateDrafts((d) => ({ ...d, [cur]: e.target.value }))
                  }
                  onBlur={() => void commitRate(cur)}
                />
                <span className="rate-label">{base}</span>
              </label>
            ))}
            <button
              className="primary"
              disabled={fetching}
              onClick={() => void refreshRates()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshIcon size={16} />
              {fetching ? 'Updating…' : 'Get latest rates'}
            </button>
            {settings.ratesUpdatedAt && (
              <p className="muted small" style={{ margin: 0 }}>
                Last automatic update:{' '}
                {new Date(settings.ratesUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </>
        )}
        {rateMessage && <p className="notice">{rateMessage}</p>}
      </div>

      <div className="section-head">
        <h2>Backup</h2>
      </div>
      <div className="info-card">
        Your data lives only on this device. Export regularly and keep the file
        somewhere safe — it is the only copy.
      </div>

      <div className="stat-line">
        {accounts.length} accounts · {transactions.length} transactions
      </div>

      <div className="stack">
        <button className="primary" onClick={() => void exportBackup()}>
          Export backup (.json)
        </button>
        <button onClick={() => fileRef.current?.click()}>Import backup…</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {message && <p className="notice">{message}</p>}
    </section>
  )
}
