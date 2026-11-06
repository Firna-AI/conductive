/** Joins the class names that apply, and skips the others. */
export function classes(
  ...names: (string | false | null | undefined)[]
): string {
  return names
    .filter((name): name is string => typeof name === 'string' && name !== '')
    .join(' ')
}
