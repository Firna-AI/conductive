import type { HttpFetch } from '../../env'
import { isRecord } from '../../http'
import type { Workspace } from '../../workspace'
import type { OuterRuntime } from './outer-runtime.test-support'

interface HeldStart {
  workspaceId: string
  sandboxId: string
  processId: number
}

type CreationOutcome =
  | { workspaceId: string; state: 'succeeded' }
  | {
      workspaceId: string
      state: 'failed'
      errorCode: string
      cleanupComplete: boolean
    }

export class BrowserStartControl {
  private mode: 'succeed' | 'armed' | 'held' | 'fail' = 'succeed'
  private target: HeldStart | null = null
  private held: Promise<HeldStart> | undefined
  private publishHeld: ((start: HeldStart) => void) | undefined
  private outcome: CreationOutcome | null = null
  private tail: Promise<unknown> = Promise.resolve()
  private readonly fixture: OuterRuntime
  private readonly workspaceForSandbox: (id: string) => string | undefined

  constructor(
    fixture: OuterRuntime,
    workspaceForSandbox: (id: string) => string | undefined,
  ) {
    this.fixture = fixture
    this.workspaceForSandbox = workspaceForSandbox
  }

  status() {
    return { mode: this.mode, held: this.target, outcome: this.outcome }
  }

  holdNext() {
    if (this.mode === 'armed' || this.mode === 'held')
      throw new Error('A fake start is already held.')
    this.mode = 'armed'
    this.target = null
    this.outcome = null
    this.held = new Promise<HeldStart>((resolve) => {
      this.publishHeld = resolve
    })
    return this.status()
  }

  waitHeld(): Promise<HeldStart> {
    if (!this.held) throw new Error('Arm a fake start hold first.')
    return this.held
  }

  failHeld() {
    if (this.mode !== 'held' || !this.target)
      throw new Error('Wait for the held fake command first.')
    this.mode = 'fail'
    return this.status()
  }

  allowSuccess() {
    this.mode = 'succeed'
    return this.status()
  }

  fetch(request: Request, fetch: HttpFetch): Promise<Response> {
    const response = this.tail.then(() => this.external(request, fetch))
    this.tail = response.catch(() => undefined)
    return response
  }

  private async external(
    request: Request,
    fetch: HttpFetch,
  ): Promise<Response> {
    const path = new URL(request.url).pathname.replace('/api/v1', '')
    const match = path.match(/^\/sandboxes\/([^/]+)\/commands(?:\/(\d+))?$/)
    const sandboxId = match ? decodeURIComponent(match[1]) : null
    const selected =
      this.target &&
      sandboxId === this.target.sandboxId &&
      Number(match?.[2]) === this.target.processId
    const boat = this.fixture.boat
    const running = boat.commandRunning
    const exitCode = boat.commandExitCode
    if (selected && (this.mode === 'held' || this.mode === 'fail')) {
      boat.commandRunning = this.mode === 'held'
      boat.commandExitCode = this.mode === 'fail' ? 1 : 0
    }
    try {
      const response = await fetch(request)
      if (
        this.mode === 'armed' &&
        sandboxId &&
        !match?.[2] &&
        request.method === 'POST' &&
        response.ok
      ) {
        const input: unknown = await request.clone().json()
        const result: unknown = await response.clone().json()
        const workspaceId = this.workspaceForSandbox(sandboxId)
        if (
          workspaceId &&
          isRecord(input) &&
          input.detached === true &&
          isRecord(result) &&
          typeof result.processId === 'number' &&
          Number.isSafeInteger(result.processId) &&
          result.processId > 0
        ) {
          this.target = { workspaceId, sandboxId, processId: result.processId }
          this.mode = 'held'
          this.publishHeld?.(this.target)
          this.publishHeld = undefined
        }
      }
      return response
    } finally {
      boat.commandRunning = running
      boat.commandExitCode = exitCode
    }
  }

  async creationResult(workspaceId: string): Promise<CreationOutcome> {
    const target = this.target
    if (!target || target.workspaceId !== workspaceId)
      throw new Error('The workspace is not the held creation.')
    try {
      const bindings = await this.fixture.runtime.getBindings<{
        WORKSPACES: DurableObjectNamespace<Workspace>
      }>()
      const result =
        await bindings.WORKSPACES.getByName(workspaceId).waitCreationLifecycle()
      this.outcome = result.ok
        ? { workspaceId, state: 'succeeded' }
        : {
            workspaceId,
            state: 'failed',
            errorCode: result.error.code,
            cleanupComplete:
              result.error.code !== 'workspace_cleanup_pending' &&
              this.fixture.boat.deletedIds.includes(target.sandboxId),
          }
      return this.outcome
    } catch {
      throw new Error('The real creation completion could not be read.')
    }
  }
}
