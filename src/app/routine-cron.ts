import { CronPattern } from 'croner'

/** Why the form refuses a custom cron: it is no valid cron, or too frequent. */
export type CronProblem = 'invalid' | 'frequent'

/**
 * A custom cron needs five valid fields, and its minute field must name one
 * minute, so that it runs at most once an hour. The Worker applies the same
 * rule with the same library.
 */
export function cronProblem(cron: string): CronProblem | null {
  const fields = cron.trim().replace(/\s+/g, ' ')
  if (fields.split(' ').length !== 5) return 'invalid'
  let pattern: CronPattern
  try {
    pattern = new CronPattern(fields, undefined, { mode: '5-part' })
  } catch {
    return 'invalid'
  }
  const minutes = pattern.minute.filter((value) => value === 1).length
  return minutes === 1 ? null : 'frequent'
}
