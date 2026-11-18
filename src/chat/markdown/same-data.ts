/**
 * Whether two values hold the same plain data: the same strings, numbers,
 * booleans, and nulls, in arrays and objects of the same shape. The blocks
 * and the inline text of an agent message hold plain data only, so each
 * update of a live message can keep the drawing of each block that did not
 * change. Two parses of the same text give the same data.
 */
export function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    return (
      a.length === b.length &&
      a.every((item, index) => sameData(item, b[index]))
    )
  }
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      sameData(Reflect.get(a, key), Reflect.get(b, key)),
  )
}
