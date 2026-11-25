import type { RunnerFileCommand } from '../../src/shared/generated/RunnerFileCommand'
import type { RunnerFileResponse } from '../../src/shared/generated/RunnerFileResponse'
import type { RunnerReadSkill } from '../../src/shared/generated/RunnerReadSkill'
import type { RunnerSkillResult } from '../../src/shared/generated/RunnerSkillResult'
import { isRecord, type HttpError } from '../http'
import type { AuthenticatedRunner } from './authenticated-runner'

type ReadResultType = (RunnerFileResponse | RunnerSkillResult)['type']

interface PendingRead {
  connectionId: string
  resultType: ReadResultType
  expiresAt: number | undefined
  finish(value: unknown): void
  fail(): void
}

export type RunnerReadQueue = (
  send: (peer: AuthenticatedRunner) => Promise<boolean>,
) => Promise<boolean>

export interface RunnerReadDispatch {
  authorize(): Promise<void>
  isPending(): boolean
}

type ReadRequest<T> = {
  connectionId: string
  parse(value: unknown): T
  signal?: AbortSignal
} & (
  | { resultType: RunnerSkillResult['type']; timeoutMs: number }
  | { resultType: RunnerFileResponse['type']; timeoutMs?: never }
)

type TrackedRead<T> = ReadRequest<T> & {
  requestId: string
  send(isPending: () => boolean): void | boolean | Promise<boolean>
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
    if (request.expiresAt !== undefined && Date.now() >= request.expiresAt) {
      request.fail()
      return false
    }
    request.finish(value.result)
    return true
  }

  request<T>(input: TrackedRead<T>): Promise<T> {
    return this.track(input)
  }

  async requestWithAccess<T>(
    input: ReadRequest<T | Promise<T>> & {
      command: RunnerFileCommand | RunnerReadSkill
      queue: RunnerReadQueue
      authorize(): Promise<void>
    },
  ): Promise<T> {
    const { authorize, command, queue } = input
    try {
      const reply = await this.track(
        {
          ...input,
          requestId: command.requestId,
          send: (isPending) =>
            queue((peer) => peer.sendRead(command, { authorize, isPending })),
          parse: (value) => value,
        },
        (error) => error,
      )
      return await input.parse(reply)
    } finally {
      await authorize()
    }
  }

  private track<T>(
    input: TrackedRead<T>,
    sendError: (error: unknown) => unknown = this.unavailable,
  ): Promise<T> {
    const { requestId, connectionId, resultType, signal, timeoutMs } = input
    return new Promise<T>((resolve, reject) => {
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
      const rejectRead = (error: unknown) => {
        if (clear()) reject(error)
      }
      const fail = () => rejectRead(this.unavailable())
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
      const isPending = () =>
        !settled &&
        (request.expiresAt === undefined || Date.now() < request.expiresAt)
      const sendFailed = (error: unknown) => rejectRead(sendError(error))
      try {
        void Promise.resolve(input.send(isPending)).then((sent) => {
          if (sent === false) fail()
        }, sendFailed)
      } catch (error) {
        sendFailed(error)
      }
    })
  }
}
