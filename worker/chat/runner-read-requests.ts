import type { RunnerFileResponse } from '../../src/shared/generated/RunnerFileResponse'
import type { RunnerSkillResult } from '../../src/shared/generated/RunnerSkillResult'
import { isRecord, type HttpError } from '../http'

type ReadResultType = (RunnerFileResponse | RunnerSkillResult)['type']

interface PendingRead {
  connectionId: string
  resultType: ReadResultType
  expiresAt: number | undefined
  finish(value: unknown): void
  fail(): void
}

type ReadRequest<T> = {
  connectionId: string
  requestId: string
  send(signal: AbortSignal): void | boolean | Promise<boolean>
  parse(value: unknown): T
  signal?: AbortSignal
} & (
  | { resultType: RunnerSkillResult['type']; timeoutMs: number }
  | { resultType: RunnerFileResponse['type']; timeoutMs?: never }
)

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
    if (request.expiresAt !== undefined && Date.now() >= request.expiresAt) {
      request.fail()
      return false
    }
    request.finish(value.result)
    return true
  }

  request<T>(input: ReadRequest<T>): Promise<T> {
    const { requestId, connectionId, resultType, signal, timeoutMs } = input
    return new Promise<T>((resolve, reject) => {
      const sendController = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      let settled = false
      const clear = () => {
        if (settled) return false
        settled = true
        if (this.pending.get(requestId) === request)
          this.pending.delete(requestId)
        signal?.removeEventListener('abort', fail)
        if (timer !== undefined) clearTimeout(timer)
        return true
      }
      const fail = () => {
        if (!clear()) return
        sendController.abort()
        reject(this.unavailable())
      }
      const request: PendingRead = {
        connectionId,
        resultType,
        expiresAt: timeoutMs === undefined ? undefined : Date.now() + timeoutMs,
        fail,
        finish: (value) => {
          if (!clear()) return
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
      if (timeoutMs !== undefined) timer = setTimeout(fail, timeoutMs)
      try {
        void Promise.resolve(input.send(sendController.signal)).then((sent) => {
          if (sent === false) fail()
        }, fail)
      } catch {
        fail()
      }
    })
  }
}
