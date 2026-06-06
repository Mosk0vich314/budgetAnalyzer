// Money is stored as integer cents everywhere in the app. These helpers are
// the single boundary between cents (storage/maths) and human strings (UI).

/** Parse a user-typed amount like "1.234,56" or "1,234.56" or "12" into cents. */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Normalise: keep digits, separators and a leading sign.
  let s = trimmed.replace(/[^\d.,-]/g, '')
  const negative = s.startsWith('-')
  s = s.replace(/-/g, '')

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  // The right-most separator is treated as the decimal point.
  const decimalSep = lastComma > lastDot ? ',' : lastDot > -1 ? '.' : ''

  let intPart = s
  let fracPart = ''
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep)
    intPart = s.slice(0, idx)
    fracPart = s.slice(idx + 1)
  }
  intPart = intPart.replace(/[.,]/g, '')
  fracPart = (fracPart + '00').slice(0, 2)

  if (!intPart && !fracPart) return null
  const cents = Number(intPart || '0') * 100 + Number(fracPart || '0')
  if (Number.isNaN(cents)) return null
  return negative ? -cents : cents
}

/** Format cents into a localized currency string. */
export function formatCents(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/** Plain decimal string (no currency symbol) for editable inputs. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}
