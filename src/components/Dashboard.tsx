import { useStore } from '../store'
import { computeTotals, monthlyFlow } from '../selectors'
import { formatCents } from '../money'

const KIND_LABELS: Record<string, string> = {
  bank: 'Bank',
  cash: 'Cash',
  investment: 'Invested',
}

export function Dashboard() {
  const { accounts, transactions } = useStore()
  const totals = computeTotals(accounts, transactions)
  const flow = monthlyFlow(transactions).slice(0, 6)

  return (
    <section>
      <header className="page-head">
        <h1>Net worth</h1>
        <p className="net-worth">{formatCents(totals.netWorth)}</p>
      </header>

      <div className="cards">
        {(['bank', 'investment', 'cash'] as const).map((kind) => (
          <div className="card" key={kind}>
            <span className="card-label">{KIND_LABELS[kind]}</span>
            <span className="card-value">{formatCents(totals.byKind[kind])}</span>
          </div>
        ))}
      </div>

      <h2>Recent months</h2>
      {flow.length === 0 ? (
        <p className="muted">No transactions yet. Add some under Activity.</p>
      ) : (
        <ul className="flow-list">
          {flow.map((m) => (
            <li key={m.month} className="flow-row">
              <span className="flow-month">{m.month}</span>
              <span className="amount-in">+{formatCents(m.in)}</span>
              <span className="amount-out">−{formatCents(m.out)}</span>
              <span className="flow-net">{formatCents(m.in - m.out)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
