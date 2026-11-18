/**
 * The fixed reasons of a D1 error in a warning. A warning never copies the
 * text of the error, because a message can quote a stored value.
 */
export const D1_ERROR_REASONS = [
  'no_such_table',
  'no_such_column',
  'constraint',
  'syntax',
  'overloaded',
  'network',
  'reset',
  'transient',
  'other',
] as const

export type D1ErrorReason = (typeof D1_ERROR_REASONS)[number]

/** Each pattern matches a fixed part of a D1 or SQLite error text. */
const PATTERNS: readonly (readonly [RegExp, D1ErrorReason])[] = [
  [/\bno such table\b/i, 'no_such_table'],
  [/\bno such column\b|\bhas no column named\b/i, 'no_such_column'],
  [/\bconstraint failed\b|\bSQLITE_CONSTRAINT\b/, 'constraint'],
  [/\bsyntax error\b|\bincomplete input\b/i, 'syntax'],
  [/\boverloaded\b/i, 'overloaded'],
  [/\bnetwork connection lost\b/i, 'network'],
  [/\breset\b/i, 'reset'],
  [/\btransient\b/i, 'transient'],
]

/**
 * The reason of an error that D1 threw, or null for any other error. A D1
 * error text starts with `D1_` or `D1 `, as in `D1_ERROR: no such table: x`,
 * or it names the `D1 DB`.
 */
export function d1ErrorReason(error: unknown): D1ErrorReason | null {
  if (!(error instanceof Error) || !/^D1[_ ]|\bD1 DB\b/.test(error.message))
    return null
  return (
    PATTERNS.find(([pattern]) => pattern.test(error.message))?.[1] ?? 'other'
  )
}
