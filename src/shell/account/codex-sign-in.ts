import type { AccountModel } from '../../app/account-model'
import type { ApiError } from '../../app/api/client'
import type { AppServices } from '../../app/services'
import { asApiError, Store, type Readable } from '../../app/store'
import type {
  PollCodexDeviceResponse,
  StartCodexDeviceResponse,
} from '../../shared/account'

/** The code that OpenAI gave, and the page of OpenAI where the user enters it. */
export type SignInCode = Pick<
  StartCodexDeviceResponse,
  'userCode' | 'verificationUrl'
>

/**
 * The step of the sign-in, as the mockups name it: before the start, the
 * code while the page waits for the sign-in, the code expired, and the
 * sign-in refused. A refused sign-in has the cause of the poll state
 * `failed`, or of a request that failed.
 */
export type SignInStage =
  | { step: 'start' }
  | { step: 'code'; code: SignInCode }
  | { step: 'expired' }
  | { step: 'refused'; cause: string }

/** What the form shows of the sign-in. */
export interface SignInState {
  stage: SignInStage
  /** A request for a code runs, so the button that asked for it is busy. */
  starting: boolean
}

/** The sign-in that the polls follow. */
interface Following {
  handle: string
  /** When the code stops working, in Unix milliseconds. */
  expiresAt: number
  /** Runs when the sign-in connects. */
  connected: () => void
}

/**
 * The shortest wait before a poll. A wait of 0, which the Worker gives when
 * OpenAI names no interval, would send each poll right after the last one.
 */
const shortestWait = 1_000

/**
 * A request can work later when it got no answer, when the server asked
 * for fewer requests, or when the server failed.
 */
function passing(error: ApiError): boolean {
  return error.status === 0 || error.status === 429 || error.status >= 500
}

/**
 * The ChatGPT sign-in of Codex in the Connect form. `start` asks the Worker
 * for a code. The sign-in then asks the Worker for its state after each wait
 * that the Worker gives, until it connects, the code expires, or OpenAI
 * refuses it. A request for a code that failed shows its cause in the place
 * of a refused sign-in, as the Worker refuses a code when device code
 * sign-in is off. A poll that can work later, as `passing` says, waits
 * again while the code works. Another failed poll shows its cause, and a
 * failed poll after the code expired shows the code expired.
 *
 * One poll runs or one timer waits at a time. `stop`, as Cancel and the end
 * of the form do, cancels the timer. An answer after it changes nothing and
 * starts no poll, except a connected sign-in: the Worker saved that login,
 * so the account shows it and the `connected` of its start runs.
 */
export class CodexSignIn {
  private readonly shown = new Store<SignInState>({
    stage: { step: 'start' },
    starting: false,
  })
  readonly state: Readable<SignInState> = this.shown
  /** Counts up at each start and stop, so an older answer knows it is old. */
  private run = 0
  private cancelTimer: (() => void) | null = null
  private readonly account: Pick<
    AccountModel,
    'startCodexSignIn' | 'pollCodexSignIn'
  >
  private readonly services: Pick<AppServices, 'delay' | 'now'>

  constructor(
    account: Pick<AccountModel, 'startCodexSignIn' | 'pollCodexSignIn'>,
    services: Pick<AppServices, 'delay' | 'now'>,
  ) {
    this.account = account
    this.services = services
  }

  /**
   * Asks for a code, as Get a code and Get a new code do. The step stays
   * until the answer. While a request runs, a second call does nothing.
   * `connected` runs when this sign-in connects.
   */
  async start(connected: () => void): Promise<void> {
    if (this.shown.get().starting) return
    const run = this.restart()
    this.shown.change((state) => ({ ...state, starting: true }))
    let started: StartCodexDeviceResponse
    try {
      started = await this.account.startCodexSignIn()
    } catch (error) {
      const cause = asApiError(error).message
      if (run === this.run) this.show({ step: 'refused', cause })
      return
    }
    if (run !== this.run) return
    const { handle, expiresAt, userCode, verificationUrl } = started
    this.show({ step: 'code', code: { userCode, verificationUrl } })
    this.schedule(run, { handle, expiresAt, connected }, started.pollIntervalMs)
  }

  /** Ends the sign-in: no poll starts, and an answer changes no step. */
  stop(): void {
    this.restart()
    if (!this.shown.get().starting) return
    this.shown.change((state) => ({ ...state, starting: false }))
  }

  /** Cancels the timer, and makes each running request old. */
  private restart(): number {
    this.cancelTimer?.()
    this.cancelTimer = null
    this.run += 1
    return this.run
  }

  private schedule(run: number, following: Following, wait: number): void {
    this.cancelTimer = this.services.delay(Math.max(wait, shortestWait), () => {
      this.cancelTimer = null
      return this.poll(run, following, wait)
    })
  }

  private async poll(
    run: number,
    following: Following,
    wait: number,
  ): Promise<void> {
    let answer: PollCodexDeviceResponse
    try {
      answer = await this.account.pollCodexSignIn(following.handle)
    } catch (error) {
      if (run === this.run) this.failed(run, following, wait, asApiError(error))
      return
    }
    if (answer.state === 'connected') {
      if (run === this.run) this.restart()
      following.connected()
      return
    }
    if (run !== this.run) return
    switch (answer.state) {
      case 'waiting':
        this.schedule(run, following, answer.pollIntervalMs)
        return
      case 'expired':
        this.show({ step: 'expired' })
        return
      case 'failed':
        this.show({ step: 'refused', cause: answer.cause })
        return
    }
  }

  /**
   * A poll that failed. After the code expired, the Worker can forget the
   * sign-in, so its refusal shows the code expired.
   */
  private failed(
    run: number,
    following: Following,
    wait: number,
    error: ApiError,
  ): void {
    if (this.services.now() >= following.expiresAt) {
      this.show({ step: 'expired' })
    } else if (passing(error)) {
      this.schedule(run, following, wait)
    } else {
      this.show({ step: 'refused', cause: error.message })
    }
  }

  private show(stage: SignInStage): void {
    this.shown.set({ stage, starting: false })
  }
}
