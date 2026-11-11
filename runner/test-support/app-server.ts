import { object, string } from '../src/parse'
import type {
  ProcessPort,
  ProcessRequest,
  StartProcess,
} from '../src/providers/process'

export class FakeAppServer implements ProcessPort {
  readonly writes: Record<string, unknown>[] = []
  private line: (line: string) => void = () => {}
  private skillsResponse: Promise<void> = Promise.resolve()
  turns = 0
  closed = false
  closeWait: Promise<void> | null = null
  onClosing: () => void = () => {}
  skillsList: () => unknown = () => ({ data: [] })

  write(line: string): void {
    const value: unknown = JSON.parse(line)
    const request = object(value)
    this.writes.push(request)
    if (request.id === undefined) return
    const method = string(request.method)
    if (method === 'skills/list') {
      this.skillsResponse = Promise.resolve()
        .then(() => this.skillsList())
        .then(
          (result) => this.line(JSON.stringify({ id: request.id, result })),
          (error: unknown) =>
            this.line(
              JSON.stringify({
                id: request.id,
                error: {
                  code: -32000,
                  message:
                    error instanceof Error ? error.message : 'List failed.',
                },
              }),
            ),
        )
      return
    }
    let result: unknown = {}
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
  idle(): Promise<void> {
    return this.skillsResponse
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
  skillsList: () => unknown = () => ({ data: [] })
  readonly start: StartProcess = (request) => {
    this.requests.push(request)
    const server = new FakeAppServer()
    server.skillsList = () => this.skillsList()
    this.processes.push(server)
    return server
  }
  get latest(): FakeAppServer {
    const server = this.processes.at(-1)
    if (!server) throw new Error('The test did not start an App Server.')
    return server
  }
}
