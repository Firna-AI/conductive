import { useServices } from '../../app/services'
import { formatWhen, useNow } from '../../app/time'

/**
 * The time now, and how long ago a moment was, such as "8 hours ago". Both
 * move on at each interval while the screen shows them.
 */
export function useWhen(intervalMs: number): {
  now: number
  when: (time: number) => string
} {
  const now = useNow(intervalMs)
  const { timeZone } = useServices()
  return { now, when: (time) => formatWhen(now, time, timeZone) }
}

/** A time inside a sentence: "Yesterday" becomes "yesterday". */
export function inSentence(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}
