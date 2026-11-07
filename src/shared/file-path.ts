/** Repository-relative Git paths keep all characters except NUL. */
export function isFilePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\0') &&
    value
      .split('/')
      .every((part) => part !== '' && part !== '.' && part !== '..')
  )
}
