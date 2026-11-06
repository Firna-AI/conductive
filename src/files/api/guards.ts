/** A JSON object whose fields are not checked yet. */
export type JsonObject = Readonly<Record<string, unknown>>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readString(object: JsonObject, key: string): string | null {
  const value = object[key]
  return typeof value === 'string' ? value : null
}

/** A finite number, or null. */
export function readNumber(object: JsonObject, key: string): number | null {
  const value = object[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A whole number that is zero or more, as for counts, sizes, and revisions. */
export function readCount(object: JsonObject, key: string): number | null {
  const value = readNumber(object, key)
  return value !== null && Number.isInteger(value) && value >= 0 ? value : null
}

export function readArray(
  object: JsonObject,
  key: string,
): readonly unknown[] | null {
  const value = object[key]
  return Array.isArray(value) ? value : null
}

/** Keeps the items that the parser accepts, and drops the others. */
export function parseItems<T>(
  items: readonly unknown[],
  parse: (item: unknown) => T | null,
): T[] {
  const parsed: T[] = []
  for (const item of items) {
    const value = parse(item)
    if (value !== null) parsed.push(value)
  }
  return parsed
}
