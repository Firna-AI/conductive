import type { HttpFetch } from '../env'
import { isRecord } from '../http'
import type { SandboxState } from '../sandbox/provider'
import { FakeBoat } from '../test-support/fake-boat'

/** Exercises BoatClient against the unchanged fake's public response override. */
export class LifecycleBoat {
  readonly server = new FakeBoat()
  readonly commands: string[] = []
  readonly commandRequests: {
    sandboxId: string
    command: string
    detached: boolean
  }[] = []
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
  beforeSandboxRead?: (sandboxId: string) => Promise<void>
  beforeCommand?: (command: string, detached: boolean) => Promise<void>
  readonly deletedSnapshots: string[] = []
  readonly statusRequests: {
    processId: number
    stdoutOffset: number
    stderrOffset: number
  }[] = []
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
        this.commands.push(body.command)
        this.commandRequests.push({
          sandboxId,
          command: body.command,
          detached: body.detached === true,
        })
        await this.beforeCommand?.(body.command, body.detached === true)
        response =
          body.detached === true
            ? Response.json({
                ok: true,
                success: true,
                type: 'command.started',
                processId: ++this.processId,
              })
            : Response.json({
                ok: true,
                type: 'command.finished',
                exitCode: this.synchronousExitCode,
                stdout: this.synchronousOutput,
                stderr: '',
                timedOut: false,
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
        await this.beforeStatus?.()
        const processId = Number(operation.slice('commands/'.length))
        const offset = Number(url.searchParams.get('stdoutOffset') ?? '0')
        const stderrOffset = Number(url.searchParams.get('stderrOffset') ?? '0')
        this.statusRequests.push({
          processId,
          stdoutOffset: offset,
          stderrOffset,
        })
        const text = this.commandOutput
        const stdout = text.slice(offset, offset + this.statusChunkSize)
        const nextOffset = offset + stdout.length
        const stderr = this.commandStderr.slice(
          stderrOffset,
          stderrOffset + this.statusChunkSize,
        )
        const stderrNextOffset = stderrOffset + stderr.length
        response = Response.json({
          ok: true,
          success: true,
          type: 'command.status',
          processId,
          status: this.commandRunning ? 'running' : 'exited',
          running: this.commandRunning,
          exitCode: this.commandRunning ? null : this.commandExitCode,
          timedOut: false,
          stdout,
          stderr,
          stdoutOffset: offset,
          stderrOffset,
          stdoutNextOffset: nextOffset,
          stderrNextOffset,
          more:
            nextOffset < text.length ||
            stderrNextOffset < this.commandStderr.length,
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
    if (loseReply) {
      await this.afterLostCreate?.()
      throw new Error('Lost create response')
    }
    return reply
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
