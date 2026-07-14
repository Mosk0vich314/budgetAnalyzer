// Exchange-rate helpers. Rates live in AppSettings.rates as
// "1 unit of currency X = rates[X] units of baseCurrency" and can be edited
// manually (Settings tab) or refreshed from the Frankfurter API — a free,
// keyless mirror of the ECB daily reference rates. Fetching is always
// user-initiated and optional: the app stays fully functional offline with
// manually entered rates.

/** Currencies offered in the account form picker (ISO 4217). */
export const COMMON_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK',
  'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'TRY', 'ILS', 'AED', 'SAR',
  'INR', 'CNY', 'HKD', 'SGD', 'KRW', 'THB', 'PHP', 'MYR', 'IDR', 'MXN',
  'BRL', 'ARS', 'CLP', 'COP', 'ZAR', 'RUB', 'UAH',
]

/** Currency name for the picker, via Intl (falls back to the code). */
export function currencyLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames(undefined, { type: 'currency' }).of(code)
    return name && name !== code ? `${code} — ${name}` : code
  } catch {
    return code
  }
}

interface FrankfurterResponse {
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Fetch the latest ECB rates for `currencies` into `base`.
 * Returns a partial map — currencies the ECB doesn't publish (or the base
 * itself) are simply absent and keep their manual value.
 * Throws with a readable message when offline or the base is unsupported.
 */
export async function fetchRates(
  base: string,
  currencies: string[],
): Promise<{ rates: Record<string, number>; date: string }> {
  let res: Response
  try {
    res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`,
    )
  } catch {
    throw new Error('Could not reach the rate service — are you online?')
  }
  if (!res.ok) {
    throw new Error(
      `No automatic rates available for ${base}. Enter rates manually.`,
    )
  }
  const data = (await res.json()) as FrankfurterResponse
  // Frankfurter returns "1 base = rates[X] units of X"; the app stores the
  // inverse ("1 X = n base"), so flip it.
  const out: Record<string, number> = {}
  for (const cur of currencies) {
    const perBase = data.rates[cur]
    if (cur !== base && perBase > 0) {
      out[cur] = Number((1 / perBase).toPrecision(6))
    }
  }
  return { rates: out, date: data.date }
}

/**
 * Re-express existing rates against a new base currency, e.g. when the user
 * switches base EUR → USD. Returns {} when the new base has no known rate
 * (the user then re-enters or refetches).
 */
export function rebaseRates(
  rates: Record<string, number>,
  oldBase: string,
  newBase: string,
): Record<string, number> {
  if (oldBase === newBase) return { ...rates }
  const newBaseInOld = rates[newBase]
  if (!(newBaseInOld > 0)) return {}
  const out: Record<string, number> = {
    [oldBase]: Number((1 / newBaseInOld).toPrecision(6)),
  }
  for (const [cur, rate] of Object.entries(rates)) {
    if (cur === newBase) continue
    out[cur] = Number((rate / newBaseInOld).toPrecision(6))
  }
  return out
}
