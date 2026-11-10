export function verifiedErrorStack(
  error: unknown,
  format: 'v8' | 'headerless' = 'v8',
): string | undefined {
  try {
    if (!(error instanceof Error)) return undefined
    const descriptor = Object.getOwnPropertyDescriptor(error, 'message')
    const message: unknown =
      descriptor && Object.hasOwn(descriptor, 'value')
        ? descriptor.value
        : undefined
    if (typeof message !== 'string' || message.length > 100_000)
      return undefined
    const stack: unknown = error.stack
    if (typeof stack !== 'string') return undefined
    const header = stack.match(
      /^[A-Za-z_$][A-Za-z0-9_$]{0,79}(?:: |(?=\n)|$)/,
    )?.[0]
    if (format === 'headerless') {
      if (/^\s*[A-Za-z_$][A-Za-z0-9_$]{0,79}(?:: |(?=\n)|$)/.test(stack))
        return undefined
      const bounded = stack.slice(0, 100_000)
      const lines = new Set(bounded.split(/\r?\n/))
      if (message.split(/\r?\n/).some((line) => line && lines.has(line)))
        return undefined
      return bounded
    }
    if (format !== 'v8' || !header || !stack.startsWith(message, header.length))
      return undefined
    const tail = stack.slice(header.length + message.length)
    if (tail && !tail.startsWith('\n')) return undefined
    return tail.replace(/^\n/, '').slice(0, 100_000)
  } catch {
    return undefined
  }
}
