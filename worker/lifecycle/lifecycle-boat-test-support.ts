import type { HttpFetch } from '../env'
import { isRecord } from '../http'
import type { SandboxState } from '../sandbox/provider'
import { FakeBoat } from '../test-support/fake-boat'
import { statusOutputSlice } from './lifecycle-boat-output.test-support'

interface CommandRequest {
  sandboxId: string
  command: string
  detached: boolean
}

interface StatusRequest {
  processId: number
  stdoutOffset: number
  stderrOffset: number
}

/** Exercises BoatClient against the unchanged fake's public response override. */
export class LifecycleBoat {
  readonly server = new FakeBoat()
  readonly commands: string[] = []
  readonly commandRequests: CommandRequest[] = []
  readonly fileReads: string[] = []
  readonly sandboxReads: string[] = []
  readonly deadlineIds: string[] = []
  terminalPassword = 'b'.repeat(64)
  readonly starts: Record<string, unknown>[] = []
  readonly states = new Map<string, SandboxState>()
  readonly resumeIds: string[] = []
  readonly stopIds: string[] = []
  readonly deletedIds: string[] = []
  commandRunning = false
  commandExitCode = 0
  commandOutput = 'installing...\n'
  commandStderr = ''
  statusChunkSize = Infinity
  beforeStatus?: () => Promise<void>
  synchronousExitCode = 0
  synchronousOutput = 'done\n'
  deleteFailures = 0
  failStop = false
  stopReplyState: SandboxState = 'archived'
  failDeadline = false
  hydrated: boolean | undefined
  lostCreateReplies = 0
  afterLostCreate?: () => Promise<void>
  afterCreate?: (sandboxId: string) => Promise<void>
  computerStarted?: (sandboxId: string, env: unknown) => Promise<void>
  beforeResume?: (sandboxId: string) => Promise<void>
  beforeSandboxRead?: (sandboxId: string) => Promise<void>
  beforeCommand?: (command: string, detached: boolean) => Promise<void>
  readonly deletedSnapshots: string[] = []
  readonly statusRequests: StatusRequest[] = []
  private readonly allocations = new Map<string, string>()
  private readonly snapshots = new Map<string, string>()
  private sandboxes = 0
  private processId = 0

  fetch: HttpFetch = async (request) => {
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/v1', '')
    const match = path.match(/^\/sandboxes\/([^/]+)(?:\/(.*))?$/)
    const sandboxId = match?.[1]
    const operation = match?.[2]
    let response: Response | null = null
    let loseReply = false
    let createdId: string | undefined
    let booted: { id: string; env: unknown } | undefined
    if (path.startsWith('/saved-snapshots/') && request.method === 'DELETE')
      this.deletedSnapshots.push(
        decodeURIComponent(path.slice('/saved-snapshots/'.length)),
      )
    if (path === '/sandboxes' && request.method === 'POST') {
      const body: unknown = await request.clone().json()
      if (!isRecord(body)) throw new Error('Invalid test start')
      this.starts.push(body)
      const key = request.headers.get('Idempotency-Key') ?? ''
      const id = this.allocations.get(key) ?? `bx_${++this.sandboxes}`
      this.allocations.set(key, id)
      this.states.set(id, 'ready')
      createdId = id
      booted = { id, env: body.env }
      response = this.sandbox(id)
      if (this.lostCreateReplies-- > 0) loseReply = true
    } else if (path === '/saved-snapshots' && request.method === 'POST') {
      const body: unknown = await request.clone().json()
      if (
        !isRecord(body) ||
        typeof body.name !== 'string' ||
        typeof body.sandboxId !== 'string'
      )
        throw new Error('Invalid test snapshot')
      // Boat's rule for saved snapshot names, as its 400 reply states it.
      if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(body.name))
        return Response.json(
          {
            ok: false,
            code: 'invalid_name',
            message:
              'Snapshot names are 1-63 lowercase letters, digits, or dashes, starting with a letter or digit.',
          },
          { status: 400 },
        )
      this.snapshots.set(body.name, body.sandboxId)
      response = Response.json({
        ok: true,
        type: 'snapshot.saved.info',
        snapshot: {
          name: body.name,
          sourceSandboxId: body.sandboxId,
          status: 'ready',
        },
      })
    } else if (
      path.startsWith('/saved-snapshots/') &&
      request.method === 'GET'
    ) {
      const name = decodeURIComponent(path.slice('/saved-snapshots/'.length))
      const sourceSandboxId = this.snapshots.get(name)
      if (sourceSandboxId)
        response = Response.json({
          ok: true,
          type: 'snapshot.saved.info',
          snapshot: { name, sourceSandboxId, status: 'ready' },
        })
    } else if (sandboxId) {
      if (request.method === 'DELETE') {
        if (this.deleteFailures-- > 0)
          response = Response.json(
            { ok: false, code: 'unavailable' },
            { status: 503 },
          )
        else {
          this.deletedIds.push(sandboxId)
          this.states.delete(sandboxId)
          response = this.sandbox(sandboxId)
        }
      } else if (operation === 'resume') {
        await this.beforeResume?.(sandboxId)
        const body: unknown = await request.clone().json()
        if (!isRecord(body)) throw new Error('Invalid test resume')
        booted = { id: sandboxId, env: body.env }
        this.resumeIds.push(sandboxId)
        this.states.set(sandboxId, 'ready')
        response = this.sandbox(sandboxId)
      } else if (operation === 'stop') {
        this.stopIds.push(sandboxId)
        if (this.failStop)
          response = Response.json(
            { ok: false, code: 'unavailable' },
            { status: 503 },
          )
        else {
          this.states.set(sandboxId, this.stopReplyState)
          response = this.sandbox(sandboxId)
        }
      } else if (operation === 'commands') {
        const body: unknown = await request.clone().json()
        if (!isRecord(body) || typeof body.command !== 'string')
          throw new Error('Invalid test command')
        const result = await this.command({
          sandboxId,
          command: body.command,
          detached: body.detached === true,
        })
        const { kind, ...output } = result
        response = Response.json({
          ok: true,
          ...(kind === 'command.started' && { success: true }),
          type:
            kind === 'command.started' ? 'command.started' : 'command.finished',
          ...output,
        })
      } else if (operation === 'files' && request.method === 'GET') {
        const path = url.searchParams.get('path')
        if (!path) throw new Error('Missing test file path')
        this.fileReads.push(path)
        // Boat's file API reads only under /home/user or /tmp.
        if (!/^\/(home\/user|tmp)(\/|$)/.test(path))
          return Response.json(
            {
              ok: false,
              code: 'invalid_path',
              message:
                'Path must resolve under /home/user or /tmp (work directory: /home/user).',
            },
            { status: 400 },
          )
        response = Response.json({
          ok: true,
          type: 'file.read',
          success: true,
          // Boat answers relative to its work directory, /home/user.
          path: path.replace(/^\/home\/user\//, ''),
          size: this.terminalPassword.length,
          encoding: 'base64',
          content: btoa(this.terminalPassword),
        })
      } else if (operation?.startsWith('commands/')) {
        const offsets = {
          stdoutOffset: Number(url.searchParams.get('stdoutOffset') ?? '0'),
          stderrOffset: Number(url.searchParams.get('stderrOffset') ?? '0'),
        }
        const { kind, state, ...status } = await this.status({
          processId: Number(operation.slice('commands/'.length)),
          ...offsets,
        })
        response = Response.json({
          ok: true,
          success: true,
          type: kind,
          status: state,
          ...status,
          ...offsets,
        })
      } else {
        if (request.method === 'GET') {
          this.sandboxReads.push(sandboxId)
          await this.beforeSandboxRead?.(sandboxId)
        }
        if (request.method === 'PATCH') this.deadlineIds.push(sandboxId)
        response =
          request.method === 'PATCH' && this.failDeadline
            ? Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
            : this.sandbox(sandboxId)
      }
    }
    this.server.responseOverride = response
    const reply = await this.server.fetch(request)
    if (booted && reply.ok) await this.computerStarted?.(booted.id, booted.env)
    if (loseReply) {
      await this.afterLostCreate?.()
      throw new Error('Lost create response')
    }
    if (createdId && reply.ok) await this.afterCreate?.(createdId)
    return reply
  }

  async command(request: CommandRequest) {
    const { command, detached } = request
    this.commands.push(command)
    this.commandRequests.push(request)
    await this.beforeCommand?.(command, detached)
    return detached
      ? { kind: 'command.started' as const, processId: ++this.processId }
      : {
          kind: 'command.result' as const,
          exitCode: this.synchronousExitCode,
          stdout: this.synchronousOutput,
          stderr: '',
          timedOut: false,
        }
  }

  async status(request: StatusRequest) {
    await this.beforeStatus?.()
    this.statusRequests.push(request)
    const { stdoutOffset, stderrOffset } = request
    const stdout = statusOutputSlice(
      this.commandOutput,
      stdoutOffset,
      this.statusChunkSize,
    )
    const stderr = statusOutputSlice(
      this.commandStderr,
      stderrOffset,
      this.statusChunkSize,
    )
    return {
      processId: request.processId,
      kind: 'command.status' as const,
      state: this.commandRunning ? ('running' as const) : ('exited' as const),
      running: this.commandRunning,
      exitCode: this.commandRunning ? null : this.commandExitCode,
      timedOut: false,
      stdout: stdout.text,
      stderr: stderr.text,
      stdoutNextOffset: stdout.nextOffset,
      stderrNextOffset: stderr.nextOffset,
      more: stdout.more || stderr.more,
    }
  }

  private sandbox(id: string): Response {
    return Response.json({
      ok: true,
      type: 'sandbox.info',
      sandbox: {
        id,
        state: this.states.get(id) ?? 'ready',
        hydrated: this.hydrated,
      },
    })
  }
}
