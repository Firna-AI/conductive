/**
 * Readers that narrow JSON from the API into the shared contract types. A
 * reader throws `ParseError` when a field is missing or has the wrong type,
 * so a screen never draws data that it did not check.
 */
export class ParseError extends Error {}

export type JsonObject = Readonly<Record<string, unknown>>

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function record(value: unknown, name = 'value'): JsonObject {
  if (isObject(value)) return value
  throw new ParseError(`${name} is not an object.`)
}

export function text(object: JsonObject, key: string): string {
  const value = object[key]
  if (typeof value === 'string') return value
  throw new ParseError(`${key} is not a string.`)
}

export function count(object: JsonObject, key: string): number {
  const value = object[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new ParseError(`${key} is not a number.`)
}

export function flag(object: JsonObject, key: string): boolean {
  const value = object[key]
  if (typeof value === 'boolean') return value
  throw new ParseError(`${key} is not a boolean.`)
}

export function maybeText(object: JsonObject, key: string): string | null {
  return object[key] === null || object[key] === undefined
    ? null
    : text(object, key)
}

export function maybeCount(object: JsonObject, key: string): number | null {
  return object[key] === null || object[key] === undefined
    ? null
    : count(object, key)
}

export function choice<T extends string>(
  object: JsonObject,
  key: string,
  options: readonly T[],
): T {
  const value = object[key]
  const match = options.find((option) => option === value)
  if (match !== undefined) return match
  throw new ParseError(`${key} is not one of ${options.join(', ')}.`)
}

export function nested<T>(
  object: JsonObject,
  key: string,
  read: (value: unknown) => T,
): T {
  return read(object[key])
}

export function maybeNested<T>(
  object: JsonObject,
  key: string,
  read: (value: unknown) => T,
): T | null {
  const value = object[key]
  return value === null || value === undefined ? null : read(value)
}

export function items<T>(
  object: JsonObject,
  key: string,
  read: (value: unknown) => T,
): T[] {
  const value = object[key]
  if (!Array.isArray(value)) throw new ParseError(`${key} is not a list.`)
  return value.map((item) => read(item))
}

export function texts(object: JsonObject, key: string): string[] {
  return items(object, key, (value) => {
    if (typeof value === 'string') return value
    throw new ParseError(`${key} holds a value that is not a string.`)
  })
}

/** A reply that has no body of interest, such as a 204 or a recorded echo. */
export function ignore(): void {}
