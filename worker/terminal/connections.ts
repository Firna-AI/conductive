import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { ToolDependencies } from '../previews/types'
import {
  CONNECTION_CHECK_MS,
  readConnectionAccess,
  scheduleConnectionCheck,
  type SandboxConnectionIdentity,
} from '../security/connection-access'

function accessLost() {
  return new HttpError(
    403,
    'terminal_access_lost',
    'Open the workspace again to use the terminal.',
  )
}

export class TerminalRegistration {
  readonly identity: SandboxConnectionIdentity
  deadline: number
  private live = true
  private close: (() => void) | null = null
  private readonly now: () => number
  private readonly remove: () => void

  constructor(
    identity: SandboxConnectionIdentity,
    deadline: number,
    now: () => number,
    remove: () => void,
  ) {
    this.identity = identity
    this.deadline = deadline
    this.now = now
    this.remove = remove
  }

  check = async (): Promise<void> => {
    if (!this.live || this.now() >= this.deadline) {
      this.cancel()
      throw accessLost()
    }
  }

  attach(close: () => void): void {
    this.close = close
    if (!this.live) close()
  }
  dispose = (): void => {
    if (this.live) {
      this.live = false
      this.remove()
    }
  }
  cancel(): void {
    if (!this.live) return
    this.live = false
    try {
      this.close?.()
    } finally {
      this.remove()
    }
  }
}

/** Frames use a bounded registration. One scheduled query refreshes every live identity. */
export class TerminalConnections {
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies
  private readonly registrations = new Set<TerminalRegistration>()
  private cancelPoll: (() => void) | null = null
  private cancelExpiry: (() => void) | null = null
  private checking = false

  constructor(env: AppEnv, dependencies: ToolDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  async add(
    identity: SandboxConnectionIdentity,
  ): Promise<TerminalRegistration> {
    const started = this.dependencies.now()
    const [access] = await readConnectionAccess(
      this.env.DB,
      [identity],
      started,
    )
    if (!access) throw accessLost()
    const deadline = access.deadline
    if (deadline <= this.dependencies.now()) throw accessLost()
    const registration = new TerminalRegistration(
      identity,
      deadline,
      this.dependencies.now,
      () => this.remove(registration),
    )
    this.registrations.add(registration)
    this.schedulePoll(CONNECTION_CHECK_MS)
    this.scheduleExpiry()
    return registration
  }

  private schedule(work: () => Promise<void>, delay: number) {
    return (this.dependencies.terminalSchedule ?? scheduleConnectionCheck)(
      work,
      delay,
    )
  }

  private schedulePoll(delay: number): void {
    if (this.checking || this.cancelPoll || this.registrations.size === 0)
      return
    this.cancelPoll = this.schedule(() => this.poll(), delay)
  }

  private scheduleExpiry(): void {
    this.cancelExpiry?.()
    this.cancelExpiry = null
    if (!this.registrations.size) return
    const earliest = Math.min(
      ...[...this.registrations].map((value) => value.deadline),
    )
    this.cancelExpiry = this.schedule(
      async () => {
        this.cancelExpiry = null
        for (const registration of this.registrations)
          if (registration.deadline <= this.dependencies.now())
            registration.cancel()
        this.scheduleExpiry()
      },
      Math.max(0, earliest - this.dependencies.now()),
    )
  }

  private remove(registration: TerminalRegistration): void {
    this.registrations.delete(registration)
    if (!this.registrations.size) {
      this.cancelPoll?.()
      this.cancelPoll = null
    }
    this.scheduleExpiry()
  }

  private async poll(): Promise<void> {
    this.cancelPoll = null
    this.checking = true
    const started = this.dependencies.now()
    const snapshot = [...this.registrations]
    try {
      const result = await readConnectionAccess(
        this.env.DB,
        snapshot.map((value) => value.identity),
        started,
      )
      const allowed = new Map(
        result.map((value) => [value.connectionNumber, value.deadline]),
      )
      snapshot.forEach((registration, index) => {
        if (!this.registrations.has(registration)) return
        const deadline = allowed.get(index) ?? 0
        if (deadline <= this.dependencies.now()) registration.cancel()
        else registration.deadline = deadline
      })
    } catch {
      for (const registration of snapshot) registration.cancel()
    } finally {
      this.checking = false
      this.scheduleExpiry()
      this.schedulePoll(
        Math.max(0, CONNECTION_CHECK_MS - (this.dependencies.now() - started)),
      )
    }
  }
}
