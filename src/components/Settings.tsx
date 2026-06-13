import { useRef, useState } from 'react'
import { exportBackup, importBackup } from '../backup'
import { useStore } from '../store'

export function Settings() {
  const { accounts, transactions, reload } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

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
        <h1>Backup</h1>
      </header>

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
