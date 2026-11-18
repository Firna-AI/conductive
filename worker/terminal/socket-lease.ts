import { HttpError } from '../http'

export function terminalNotFound(): HttpError {
  return new HttpError(
    404,
    'terminal_not_found',
    'This terminal is no longer available. Open another terminal.',
  )
}

/** A close cancels the lease even when the upstream upgrade has not returned. */
export class TerminalSocketLease {
  readonly terminalId: string
  private live = true
  private close: (() => void) | null = null
  private readonly release: () => void

  constructor(terminalId: string, release: () => void) {
    this.terminalId = terminalId
    this.release = release
  }

  check(): void {
    if (!this.live) throw terminalNotFound()
  }

  attach(close: () => void): void {
    this.close = close
    if (!this.live) close()
  }

  dispose = (): void => {
    if (!this.live) return
    this.live = false
    this.release()
  }

  cancel(): void {
    this.dispose()
    this.close?.()
  }
}
