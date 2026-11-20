/**
 * Apple's notary service usually answers in one or two minutes, but one
 * submission can stay in progress for an hour or more. A new submission of
 * the same package then usually passes. So each release step that waits
 * for Apple gets this time limit, and one more try when the first try runs
 * out of time.
 */
const notaryTimeLimit = 20 * 60_000

/**
 * Runs `work` with the time limit. When the limit ends the first try, this
 * stops it and starts it once more. A failure for another reason, a second
 * time-out, or a cancellation of `signal` ends the release.
 */
export async function retryAfterTimeLimit<T>(
  step: string,
  signal: AbortSignal,
  work: (signal: AbortSignal) => Promise<T>,
  deadline: () => AbortSignal = () => AbortSignal.timeout(notaryTimeLimit),
): Promise<T> {
  const minutes = notaryTimeLimit / 60_000
  for (let attempt = 1; ; attempt += 1) {
    const limit = deadline()
    try {
      return await work(AbortSignal.any([signal, limit]))
    } catch (error) {
      if (signal.aborted || !limit.aborted) throw error
      if (attempt === 2)
        throw new Error(`${step} took more than ${minutes} minutes twice`, {
          cause: error,
        })
      process.stderr.write(
        `${step} took more than ${minutes} minutes. Starting it once more.\n`,
      )
    }
  }
}
