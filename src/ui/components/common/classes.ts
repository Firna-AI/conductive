/** Joins the class names that apply, skipping the ones that do not. */
export function classes(...names: (string | false | undefined)[]): string {
  return names
    .filter((name): name is string => typeof name === 'string' && name !== '')
    .join(' ')
}
