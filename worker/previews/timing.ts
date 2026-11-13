/** Header that gives the browser the duration of each Worker step of a preview reply. */
export const SERVER_TIMING_HEADER = 'Server-Timing'

/**
 * Records the steps of one preview request for its `Server-Timing` header.
 * Each entry holds a fixed step name and a duration in milliseconds, and no ID or secret.
 * Workers advance their clock only at I/O, so each duration covers the I/O of its step.
 */
export class PreviewTiming {
  private readonly entries: string[] = []

  async step<T>(name: string, work: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      return await work()
    } finally {
      this.add(name, performance.now() - start)
    }
  }

  add(name: string, milliseconds: number): void {
    this.entries.push(`${name};dur=${Math.max(0, Math.round(milliseconds))}`)
  }

  header(): string {
    return this.entries.join(', ')
  }
}
