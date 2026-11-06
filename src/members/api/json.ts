/** A response body that does not match its contract. */
export class ResponseShapeError extends Error {}

export type JsonObject = Readonly<Record<string, unknown>>

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The value as a JSON object. `field` names it in the error. */
export function object(value: unknown, field: string): JsonObject {
  if (!isObject(value))
    throw new ResponseShapeError(`${field} is not an object`)
  return value
}

export function nested(source: JsonObject, key: string): JsonObject {
  return object(source[key], key)
}

export function text(source: JsonObject, key: string): string {
  const value = source[key]
  if (typeof value !== 'string')
    throw new ResponseShapeError(`${key} is not text`)
  return value
}

export function textOrNull(source: JsonObject, key: string): string | null {
  return source[key] === null ? null : text(source, key)
}

export function count(source: JsonObject, key: string): number {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ResponseShapeError(`${key} is not a number`)
  }
  return value
}

export function countOrNull(source: JsonObject, key: string): number | null {
  return source[key] === null ? null : count(source, key)
}

export function flag(source: JsonObject, key: string): boolean {
  const value = source[key]
  if (typeof value !== 'boolean')
    throw new ResponseShapeError(`${key} is not true or false`)
  return value
}

/** Each item of a list, read with `read`. */
export function list<T>(
  source: JsonObject,
  key: string,
  read: (item: unknown) => T,
): T[] {
  const value = source[key]
  if (!Array.isArray(value))
    throw new ResponseShapeError(`${key} is not a list`)
  const items: readonly unknown[] = value
  return items.map(read)
}

/**
 * One of a known set of values. `values` maps each value to itself, so the
 * type check fails when the set in the contract grows.
 */
export function oneOf<T extends string>(
  source: JsonObject,
  key: string,
  values: Readonly<Record<T, T>>,
): T {
  const value = source[key]
  const match = Object.values<T>(values).find((item) => item === value)
  if (match === undefined) throw new ResponseShapeError(`${key} is not known`)
  return match
}
