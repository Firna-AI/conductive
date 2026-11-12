/**
 * Reads the front matter of a Markdown file of the site, such as a guide or
 * a changelog post. The front matter can hold anything, so each reader takes
 * an unknown value and gives `undefined` for a value that it cannot use.
 */

/** The value of one field of the front matter. */
export function field(data: unknown, name: string): unknown {
  if (typeof data !== 'object' || data === null) return undefined
  return Object.getOwnPropertyDescriptor(data, name)?.value
}

/** Text that is not empty, without the spaces at its ends. */
export function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const words = value.trim()
  return words === '' ? undefined : words
}
