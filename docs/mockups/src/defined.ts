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

/**
 * A copy of data without the object keys whose value is undefined, at any
 * depth. A Mokly wrapper also fails on an undefined value inside a data
 * prop, and the builders of rows, menus, and bars leave an optional field
 * undefined, as a plain part treats it as a missing one. Pass only data,
 * never a React element: a slot goes through `defined` instead.
 */
export function plainData<T>(value: T): T
export function plainData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => plainData(item))
  if (typeof value !== 'object' || value === null) return value
  // A class instance stays as it is, so the wrapper names it as not data.
  if (Object.getPrototypeOf(value) !== Object.prototype) return value
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) result[key] = plainData(item)
  }
  return result
}
