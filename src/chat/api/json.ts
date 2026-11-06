/**
 * Small readers that narrow JSON from the Worker into the shared contract
 * types. A body that does not match throws `UnreadableResponse`, so a screen
 * never reads a field that is not there.
 */

export class UnreadableResponse extends Error {
  constructor(field: string) {
    super(`The response has no readable "${field}".`)
    this.name = 'UnreadableResponse'
  }
}

export type Reader<T> = (value: unknown) => T

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function record(
  value: unknown,
  name = 'object',
): Record<string, unknown> {
  if (!isRecord(value)) throw new UnreadableResponse(name)
  return value
}

export function text(value: unknown): string {
  if (typeof value !== 'string') throw new UnreadableResponse('text')
  return value
}

export function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UnreadableResponse('number')
  }
  return value
}

export function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new UnreadableResponse('flag')
  return value
}

function isMember<K extends string>(
  members: Readonly<Record<K, true>>,
  value: unknown,
): value is K {
  return typeof value === 'string' && Object.hasOwn(members, value)
}

/**
 * A reader for a known set of strings. The record form makes the compiler
 * name a member that the contract adds and the reader misses.
 */
export function oneOf<K extends string>(
  members: Readonly<Record<K, true>>,
): Reader<K> {
  return (value) => {
    if (!isMember(members, value)) throw new UnreadableResponse('choice')
    return value
  }
}

export function nullable<T>(read: Reader<T>): Reader<T | null> {
  return (value) => (value === null ? null : read(value))
}

export function optional<T>(read: Reader<T>): Reader<T | undefined> {
  return (value) => (value === undefined ? undefined : read(value))
}

export function list<T>(read: Reader<T>): Reader<readonly T[]> {
  return (value) => {
    if (!Array.isArray(value)) throw new UnreadableResponse('list')
    return value.map((item: unknown) => read(item))
  }
}
