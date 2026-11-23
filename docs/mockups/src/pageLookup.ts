/**
 * The path of the drawn page whose props equal the given props, or none. A
 * control links to that page, so it can lead only to a page that draws the
 * state that the control makes. With no such page, the control draws with
 * no link. The pages and the props are flat objects of plain values, as
 * the props of the screens are.
 */
export function pageWithProps<Props extends object>(
  pages: Readonly<Record<string, Props>>,
  props: Props,
): string | undefined {
  const found = Object.entries(pages).find(([, page]) => sameProps(page, props))
  return found?.[0]
}

/** Whether two flat objects hold the same keys, with the same values. */
function sameProps(first: object, second: object): boolean {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)])
  return [...keys].every(
    (key) => Reflect.get(first, key) === Reflect.get(second, key),
  )
}
