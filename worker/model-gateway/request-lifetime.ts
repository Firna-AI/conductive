import type { Agent } from '../../src/shared/generated/Agent'
import {
  CONNECTION_CHECK_MS,
  type ConnectionScheduler,
} from '../security/connection-access'
import { CodexBodyScanner } from './codex-body'
import { GatewayRequestError, refuseCodexBody } from './errors'
import type { TurnTokenCheck } from './types'
import { gatewayUpload } from './upload'
import { warnWorker } from '../warnings'

/** The first turn check must pass within this time. */
const START_LEASE_MS = 30_000

interface GatewayLifetimeOptions {
  agent: Agent
  check: () => Promise<TurnTokenCheck>
  now: () => number
  schedule: ConnectionScheduler
}

/**
 * The first turn check must pass before the request starts. Later checks run
 * every 15 seconds and end the request only when the turn refuses it.
 */
export class GatewayRequestLifetime {
  private readonly abort = new AbortController()
  readonly signal = this.abort.signal
  readonly upload: ReturnType<typeof gatewayUpload>
  private active = true
  private deadline = 0
  private cancelPoll: (() => void) | undefined
  private cancelExpiry: (() => void) | undefined
  private upstream: Response | undefined
  private readonly request: Request
  private readonly options: GatewayLifetimeOptions

  constructor(request: Request, options: GatewayLifetimeOptions) {
    this.request = request
    this.options = options
    this.upload = gatewayUpload(
      request.body,
      (reason) => this.cancel(reason),
      options.agent === 'codex' && request.method === 'POST'
        ? new CodexBodyScanner()
        : undefined,
    )
    request.signal.addEventListener('abort', this.disconnected, { once: true })
    if (request.signal.aborted) this.disconnected()
  }

  async start(): Promise<Extract<TurnTokenCheck, { ok: true }>> {
    this.deadline = this.options.now() + START_LEASE_MS
    this.scheduleExpiry()
    try {
      const checked = await this.check()
      if (this.options.agent === 'codex' && this.request.method === 'POST') {
        const encoding = this.request.headers.get('content-encoding')
        if (
          !this.request.body ||
          (encoding !== null && encoding.trim().toLowerCase() !== 'identity')
        )
          refuseCodexBody()
      }
      return checked
    } catch (error) {
      this.cancel(error)
      throw error
    }
  }

  wait<T>(work: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const aborted = () => reject(this.abort.signal.reason)
      this.abort.signal.addEventListener('abort', aborted, { once: true })
      if (this.abort.signal.aborted) aborted()
      void work.then(
        (value) => {
          this.abort.signal.removeEventListener('abort', aborted)
          resolve(value)
        },
        (error: unknown) => {
          this.abort.signal.removeEventListener('abort', aborted)
          reject(error)
        },
      )
    })
  }

  received(response: Response): Response {
    this.upstream = response
    if (this.abort.signal.aborted) this.cancelAnswer(this.abort.signal.reason)
    return response
  }

  cancel(reason: unknown): void {
    if (!this.active) return
    this.active = false
    this.abort.abort(reason)
    this.upload.cancel(reason)
    this.cancelAnswer(reason)
    this.complete()
  }

  complete(): void {
    this.active = false
    this.cancelPoll?.()
    this.cancelExpiry?.()
    this.request.signal.removeEventListener('abort', this.disconnected)
  }

  private disconnected = () => {
    this.cancel(
      new GatewayRequestError(
        'model_upstream_unavailable',
        'The model request was cancelled.',
      ),
    )
  }

  private cancelAnswer(reason: unknown): void {
    const body = this.upstream?.body
    if (body && !body.locked) void body.cancel(reason).catch(() => undefined)
  }

  private scheduleExpiry(): void {
    this.cancelExpiry?.()
    if (!this.active) return
    this.cancelExpiry = this.options.schedule(
      async () => {
        this.cancel(
          new GatewayRequestError(
            'model_gateway_unavailable',
            'The model turn could not be checked.',
          ),
        )
      },
      Math.max(0, this.deadline - this.options.now()),
    )
  }

  /** The first check must pass within the start lease. */
  private async check(): Promise<Extract<TurnTokenCheck, { ok: true }>> {
    const started = this.options.now()
    let checked: TurnTokenCheck
    try {
      checked = await this.wait(this.options.check())
    } catch {
      if (this.abort.signal.aborted) throw this.abort.signal.reason
      throw new GatewayRequestError(
        'model_gateway_unavailable',
        'The model turn could not be checked.',
      )
    }
    if (!checked.ok)
      throw new GatewayRequestError(checked.reason, 'The model turn ended.')
    this.abort.signal.throwIfAborted()
    if (!this.active) return checked
    if (this.deadline <= this.options.now())
      throw new GatewayRequestError(
        'model_gateway_unavailable',
        'The model turn could not be checked.',
      )
    this.cancelExpiry?.()
    this.cancelExpiry = undefined
    this.schedulePoll(started)
    return checked
  }

  /** Later checks end the request only on a refusal, never on a delay. */
  private async poll(): Promise<void> {
    const started = this.options.now()
    let checked: TurnTokenCheck
    try {
      checked = await this.wait(this.options.check())
    } catch {
      if (this.abort.signal.aborted || !this.active) return
      warnWorker({ kind: 'model_gateway_check_failed' })
      this.schedulePoll(started)
      return
    }
    if (!this.active) return
    if (this.options.now() - started > CONNECTION_CHECK_MS)
      warnWorker({ kind: 'model_gateway_check_late' })
    if (!checked.ok) {
      this.cancel(
        new GatewayRequestError(checked.reason, 'The model turn ended.'),
      )
      return
    }
    this.schedulePoll(started)
  }

  private schedulePoll(started: number): void {
    if (!this.active) return
    this.cancelPoll = this.options.schedule(
      () => this.poll(),
      Math.max(0, CONNECTION_CHECK_MS - (this.options.now() - started)),
    )
  }
}
