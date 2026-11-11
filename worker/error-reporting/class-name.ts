export function workerErrorClassName(value: unknown): string {
  return typeof value === 'string' &&
    /^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(value)
    ? value
    : 'Error'
}
