import { object, string } from '../src/parse'
import type {
  ProcessPort,
  ProcessRequest,
  StartProcess,
} from '../src/providers/process'

export class FakeAppServer implements ProcessPort {
  readonly writes: Record<string, unknown>[] = []
  private line: (line: string) => void = () => {}
  turns = 0
  closed = false
  /** Answers by method, in place of the default answer. */
  readonly results = new Map<string, unknown>()
  /** Methods that get no answer. */
  readonly unanswered = new Set<string>()
  closeWait: Promise<void> | null = null
  onClosing: () => void = () => {}

  write(line: string): void {
    const value: unknown = JSON.parse(line)
    const request = object(value)
    this.writes.push(request)
    if (request.id === undefined) return
    const method = string(request.method)
    if (this.unanswered.has(method)) return
    let result: unknown = this.results.get(method) ?? {}
    if (method === 'thread/start' || method === 'thread/resume')
      result = { thread: { id: 'codex-conversation' } }
    if (method === 'turn/start')
      result = { turn: { id: `codex-turn-${++this.turns}` } }
    if (method === 'turn/steer') result = { turnId: `codex-turn-${this.turns}` }
    queueMicrotask(() => this.line(JSON.stringify({ id: request.id, result })))
  }

  notify(method: string, params: unknown): void {
    this.line(JSON.stringify({ method, params }))
  }
  onLine(listener: (line: string) => void) {
    this.line = listener
  }
  onExit() {}
  close(): void | Promise<void> {
    this.onClosing()
    if (this.closeWait)
      return this.closeWait.then(() => {
        this.closed = true
      })
    this.closed = true
  }
}

export class FakeAppServers {
  readonly requests: ProcessRequest[] = []
  readonly processes: FakeAppServer[] = []
  /** Prepares each new server before the client writes to it. */
  prepare: (server: FakeAppServer) => void = () => {}
  readonly start: StartProcess = (request) => {
    this.requests.push(request)
    const server = new FakeAppServer()
    this.prepare(server)
    this.processes.push(server)
    return server
  }
  get latest(): FakeAppServer {
    const server = this.processes.at(-1)
    if (!server) throw new Error('The test did not start an App Server.')
    return server
  }
}
