/**
 * The path of the drawn page whose props equal the given props, or none. A
 * control links to that page, so it can lead only to a page that draws the
 * state that the control makes. With no such page, the control draws with
 * no link. The props are plain data, as the props of the screens are:
 * strings, numbers, booleans, and objects of them, such as the settings
 * and the facts of a page of the migration job.
 */
export function pageWithProps<Props extends object>(
  pages: Readonly<Record<string, Props>>,
  props: Props,
): string | undefined {
  const found = Object.entries(pages).find(([, page]) => sameData(page, props))
  return found?.[0]
}

/** Whether a value is a plain object, whose keys hold more data. */
function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

/** Whether two plain values are equal, key by key at each depth. */
function sameData(first: unknown, second: unknown): boolean {
  if (!isRecord(first) || !isRecord(second)) return first === second
  const keys = new Set([...Object.keys(first), ...Object.keys(second)])
  return [...keys].every((key) =>
    sameData(Reflect.get(first, key), Reflect.get(second, key)),
  )
}
