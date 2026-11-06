import { desktopPath } from '../../shared/desktop'
import type { WorkspaceEvent } from '../../shared/events'
import type { Preview } from '../../shared/previews'
import { previewsPath } from '../../shared/previews'
import { terminalPaths } from '../../shared/terminal'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeTerminal } from '../../test-support/fake-terminal'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { isRecord, type ApiFetch } from '../tool-parts/request'
import type { SubscribeWorkspaceEvents } from '../tool-parts/workspace'

export const devTools = ['terminal', 'preview', 'desktop'] as const
export type DevTool = (typeof devTools)[number]

/** The states that the development page can draw for each tool. */
export const devStates: Readonly<Record<DevTool, readonly string[]>> = {
  terminal: ['ready', 'starting', 'stopped', 'error', 'malformed'],
  preview: ['open', 'none', 'error'],
  desktop: ['ready', 'error'],
}

export interface DevRequest {
  method: string
  path: string
  body: string
  status: number
}

const failure = {
  error: { code: 'unavailable', message: 'The sandbox does not answer.' },
}

/**
 * A local page in place of a previewed app or a desktop stream. The address
 * is built as text, because Vite rewrites `new URL()` with `import.meta.url`.
 */
function fixtureUrl(name: 'preview' | 'desktop', suffix: string): string {
  const folder = import.meta.url.slice(0, import.meta.url.lastIndexOf('/'))
  return `${folder}/fixtures/${name}${suffix}`
}

function devPreview(port: number): Preview {
  return {
    id: port === 3000 ? FAKE_IDS.preview : `preview-${port}`,
    port,
    url: fixtureUrl('preview', `?port=${port}`),
    expiresAt: FAKE_TIME + 86_400_000,
  }
}

/** The fake API with the replies of one state of one tool. */
export function createDevServer(tool: DevTool, state: string): FakeApiServer {
  const server = new FakeApiServer({ conversation: 'running' })
  const org = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  server.json('GET', previewsPath(org, id), { previews: [devPreview(3000)] })
  server.json('GET', desktopPath(org, id), {
    url: fixtureUrl('desktop', '#fake-desktop-token'),
    expiresAt: FAKE_TIME + 600_000,
  })
  const terminal = terminalPaths.connection(org, id)
  if (tool === 'terminal' && (state === 'starting' || state === 'stopped')) {
    server.json('GET', terminal, { state, socketPath: null })
  }
  if (tool === 'terminal' && state === 'error') {
    server.json('GET', terminal, failure, 503)
  }
  if (tool === 'terminal' && state === 'malformed') {
    server.json('GET', terminal, { state: 'ready' })
  }
  if (tool === 'preview' && state === 'none') {
    server.json('GET', previewsPath(org, id), { previews: [] })
  }
  if (tool === 'preview' && state === 'error') {
    server.json('GET', previewsPath(org, id), failure, 503)
  }
  if (tool === 'desktop' && state === 'error') {
    server.json('GET', desktopPath(org, id), failure, 503)
  }
  return server
}

function requestedPort(body: string): number | null {
  try {
    const value: unknown = JSON.parse(body)
    return isRecord(value) && typeof value.port === 'number' ? value.port : null
  } catch {
    return null
  }
}

/**
 * The fake API's fetch, with a log. It records a reply for each preview write
 * first, so that any port opens and any preview closes.
 */
export function devFetch(
  server: FakeApiServer,
  log: (request: DevRequest) => void,
): ApiFetch {
  const previews = previewsPath(FAKE_IDS.org, FAKE_IDS.workspace)
  return async (path, init) => {
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? init.body : ''
    const port = requestedPort(body)
    if (method === 'POST' && path === previews && port !== null) {
      server.json('POST', path, { preview: devPreview(port) }, 201)
    }
    if (method === 'DELETE' && path.startsWith(`${previews}/`)) {
      server.empty('DELETE', path)
    }
    const response = await server.fetch(path, init)
    log({ method, path, body, status: response.status })
    return response
  }
}

/** Delivers the fake events, history first, as the shell's reader would. */
export function devSubscribe(server: FakeApiServer): SubscribeWorkspaceEvents {
  return (listener) =>
    server.events.subscribe(0, (message) => {
      if (message.type === 'event') listener(message.envelope)
      else message.history.events.forEach(listener)
    })
}

/** Sends one live event of a workspace through the fake events. */
export function emitDevEvent(
  server: FakeApiServer,
  workspaceId: string,
  event: WorkspaceEvent,
): void {
  server.events.emit({
    workspaceId,
    eventNumber: server.events.history().throughEventNumber + 1,
    occurredAt: FAKE_TIME,
    event,
  })
}

/** The event that says that the sandbox of the workspace runs. */
export function sandboxReadyEvent(): WorkspaceEvent {
  return {
    type: 'workspace.updated',
    workspace: workspaceFixtures().detail.workspace,
  }
}

/**
 * The fake terminal, with typed input echoed back as a shell would. It
 * reports each input and size to the development page.
 */
export class EchoTerminal extends FakeTerminal {
  private readonly report: (entry: string) => void

  constructor(report: (entry: string) => void) {
    super()
    this.report = report
  }

  write(input: string): void {
    super.write(input)
    this.report(`input ${JSON.stringify(input)}`)
    this.emit(input.replaceAll('\r', '\r\n').replaceAll('\x7f', '\b \b'))
  }

  resize(columns: number, rows: number): void {
    super.resize(columns, rows)
    this.report(`size ${columns} x ${rows}`)
  }

  close(): void {
    super.close()
    this.report('close')
  }
}
