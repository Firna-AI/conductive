/**
 * The props that have a value, without the keys whose value is undefined.
 * A Mokly wrapper fails on an undefined data prop, and it renders a slot
 * for each slot key that a call supplies, also for an undefined value. So a
 * call passes its optional props through this, as a plain part treats an
 * undefined prop as a missing one.
 */
export function defined<T extends object>(props: T): Partial<T> {
  const result: Partial<T> = {}
  for (const key in props) {
    if (props[key] !== undefined) result[key] = props[key]
  }
  return result
}
