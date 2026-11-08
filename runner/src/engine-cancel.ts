/** Cancellation releases the session queue even if a dependency ignores it. */
export function cancelable<T>(
  signal: AbortSignal,
  action: () => Promise<T>,
  late?: (value: T) => void,
): Promise<T> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    let canceled = false
    const abort = () => {
      canceled = true
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
    let pending: Promise<T>
    try {
      pending = action()
    } catch (error) {
      signal.removeEventListener('abort', abort)
      reject(error)
      return
    }
    pending.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        if (canceled) late?.(value)
        else resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}
