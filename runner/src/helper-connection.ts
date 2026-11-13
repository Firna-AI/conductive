import type { HelperOutput } from '../sdk-helper/src/generated/HelperOutput'
import type { HelperRequest } from '../sdk-helper/src/generated/HelperRequest'
import type { HelperModelResult } from '../sdk-helper/src/generated/HelperModelResult'
import type { HelperPort } from './helper-port'

class HelperError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/** Correlates replies while allowing events to stream during a request. */
export class HelperConnection {
  private nextId = 0
  private ended = false
  private closing: Promise<void> | null = null
  private readonly port: HelperPort
  private readonly pending = new Map<
    string,
    {
      resolve: (result: HelperModelResult | null) => void
      reject: (error: Error) => void
    }
  >()

  constructor(
    port: HelperPort,
    output: (output: HelperOutput) => void,
    failed: () => void,
  ) {
    this.port = port
    port.onOutput((message) => {
      if (message.type === 'response' || message.type === 'error') {
        const pending = this.pending.get(message.requestId)
        if (!pending) return
        this.pending.delete(message.requestId)
        if (message.type === 'error')
          pending.reject(new HelperError(message.code, message.message))
        else pending.resolve(message.result)
      } else output(message)
    })
    port.onExit(() => {
      this.ended = true
      for (const pending of this.pending.values())
        pending.reject(
          new HelperError('agent_exited', 'The SDK helper process ended.'),
        )
      this.pending.clear()
      if (!this.closing) failed()
    })
  }

  request(
    make: (requestId: string) => HelperRequest,
  ): Promise<HelperModelResult | null> {
    if (this.ended)
      return Promise.reject(
        new HelperError('agent_exited', 'The SDK helper process ended.'),
      )
    const requestId = String(++this.nextId)
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject })
      try {
        this.port.write(make(requestId))
      } catch (error) {
        this.pending.delete(requestId)
        reject(error)
      }
    })
  }

  close(): Promise<void> {
    this.closing ??= Promise.resolve().then(async () => {
      const watchdog = setTimeout(() => {
        void this.port.terminate()
      }, 10_000)
      watchdog.unref()
      try {
        if (!this.ended)
          await this.request((requestId) => ({ type: 'close', requestId }))
      } finally {
        clearTimeout(watchdog)
        await this.port.terminate()
        await this.port.exited
      }
    })
    return this.closing
  }
}
