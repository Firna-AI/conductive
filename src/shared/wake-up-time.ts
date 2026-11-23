import { wakeUpTimeUtc } from '../../docs/mockups/src/components/chat/wakeUpCopy'

const dateLimit = 8_640_000_000_000_000
const cycleMs = 146_097 * 86_400_000

/** An entire Gregorian cycle keeps the day, month, and time in UTC. */
export function utcWakeUpTime(at: number): string {
  if (Math.abs(at) <= dateLimit) return wakeUpTimeUtc(at)
  const cycles = Math.trunc(at / cycleMs)
  const withinCycle = at - cycles * cycleMs
  const year = new Date(withinCycle).getUTCFullYear()
  const actualYear = year + 400 * cycles
  return wakeUpTimeUtc(withinCycle).replace(
    /\d+(?=,)/,
    actualYear > 0 ? String(actualYear) : `${1 - actualYear} BC`,
  )
}
