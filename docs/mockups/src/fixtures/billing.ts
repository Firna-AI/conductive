/**
 * The prices and the billing of the orgs, as the user set them on
 * 5 November 2026. The org pays. On Team it buys seats: each seat costs
 * $30 a month and adds $15 of compute to the org's pool for the month. Use
 * beyond the pool costs the machine price plus 10%. A free org gets 600
 * minutes a month.
 */

/** The price of one seat, in dollars a month. */
export const seatPrice = 30

/** The compute that one seat adds to the pool, in cents. */
const poolCentsPerSeat = 1500

/** The price of an hour on the standard machine, in tenths of a cent. */
const hourPriceMills = 36

/** Use beyond the pool costs the machine price plus this share. */
const overageMarkup = 0.1

/**
 * The hours of the pool on the standard machine: about 416 for each seat.
 * The integer maths keeps the hours exact, such as 1,250 for 3 seats.
 */
export function poolHours(seats: number): number {
  return Math.floor((seats * poolCentsPerSeat * 10) / hourPriceMills)
}

/** The cost of the hours beyond the pool, in dollars. */
export function overageCost(hours: number): number {
  return (hours * hourPriceMills * (1 + overageMarkup)) / 1000
}

/** A whole number with thousands separators, such as 2,536. */
export function count(value: number): string {
  return value.toLocaleString('en-US')
}

/** An amount in dollars, such as $1.43. */
export function dollars(value: number): string {
  return `$${value.toFixed(2)}`
}

/** An org on Team, at a moment of its billing period. */
export type TeamBilling = {
  seats: number
  /** The billing period: the pool renews at its start. */
  period: { start: string; end: string }
  /** The compute of the period so far, in hours of the standard machine. */
  usedHours: number
  nextInvoice: string
  /** The last four digits of the card. */
  card: string
}

/** Acme near the end of a period, a little over its pool. */
export const acmeTeam: TeamBilling = {
  seats: 6,
  period: { start: '8 October', end: '7 November' },
  usedHours: 2536,
  nextInvoice: '8 November',
  card: '4242',
}

/** The seats that the upgrade of the free org buys. */
export const upgradeSeats = 3

/** The free org right after its upgrade, back from Stripe Checkout. */
export const firnaTeam: TeamBilling = {
  seats: upgradeSeats,
  period: { start: '5 November', end: '4 December' },
  usedHours: 2,
  nextInvoice: '5 December',
  card: '4242',
}

/** The minutes of the free org this month, on its billing tab. */
export const firnaMinutes = { used: 412, month: 'November' } as const
