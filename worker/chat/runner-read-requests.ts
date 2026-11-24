import type { RunnerFileResponse } from '../../src/shared/generated/RunnerFileResponse'
import type { RunnerSkillResult } from '../../src/shared/generated/RunnerSkillResult'
import { isRecord, type HttpError } from '../http'

type ReadResultType = (RunnerFileResponse | RunnerSkillResult)['type']

interface PendingRead {
  connectionId: string
  resultType: ReadResultType
  finish(value: unknown): void
  fail(): void
}

export class RunnerReadRequests {
  private readonly pending = new Map<string, PendingRead>()
  private readonly unavailable: () => HttpError

  constructor(unavailable: () => HttpError) {
    this.unavailable = unavailable
  }

  detach(connectionId: string): void {
    for (const request of this.pending.values())
      if (request.connectionId === connectionId) request.fail()
  }

  receive(connectionId: string, value: unknown): boolean {
    if (!isRecord(value) || typeof value.requestId !== 'string') return false
    const request = this.pending.get(value.requestId)
    if (
      !request ||
      request.connectionId !== connectionId ||
      request.resultType !== value.type
    )
      return false
    request.finish(value.result)
    return true
  }

  request<T>(input: {
    connectionId: string
    requestId: string
    resultType: ReadResultType
    send(): void | boolean | Promise<boolean>
    parse(value: unknown): T
    signal?: AbortSignal
  }): Promise<T> {
    const { requestId, connectionId, resultType, signal } = input
    return new Promise<T>((resolve, reject) => {
      const clear = () => {
        if (this.pending.get(requestId) === request)
          this.pending.delete(requestId)
        signal?.removeEventListener('abort', fail)
      }
      const fail = () => {
        clear()
        reject(this.unavailable())
      }
      const request: PendingRead = {
        connectionId,
        resultType,
        fail,
        finish: (value) => {
          clear()
          try {
            resolve(input.parse(value))
          } catch (error) {
            reject(error)
          }
        },
      }
      this.pending.set(requestId, request)
      signal?.addEventListener('abort', fail, { once: true })
      if (signal?.aborted) {
        fail()
        return
      }
      try {
        void Promise.resolve(input.send()).then((sent) => {
          if (sent === false) fail()
        }, fail)
      } catch {
        fail()
      }
    })
  }
}
