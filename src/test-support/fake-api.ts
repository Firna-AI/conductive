import type { PathState } from '../../docs/mockups/src/fixtures/maskedFiles'
import type { OrgRole } from '../shared/api'
import { chatHistoryPath } from '../shared/events'
import type { BannerState } from '../shared/github'
import type { WorkspaceState } from '../shared/workspaces'
import type { FakeMethod, FakeRouteWriter } from './fake-api-routes'
import { fakeCoreRoutes } from './fake-core-routes'
import { fakeDeviceRoutes } from './fake-device-routes'
import { FakeWorkspaceEvents } from './fake-events'
import { fakeToolRoutes } from './fake-tool-routes'
import { fakeWorkspaceRoutes } from './fake-workspace-routes'
import { FAKE_IDS, FAKE_ORIGIN } from './fixtures/core'
import type { FakeMacScenario } from './fixtures/devices'
import {
  maskedChangedFiles,
  withMaskedTurnFiles,
} from './fixtures/masked-paths'
import { workspaceFixtures } from './fixtures/workspaces'
import { recordedChatEvents, type RecordedChatScenario } from './recorded-chat'
import { recordedFileEvents } from './recorded-files'

export interface FakeApiOptions {
  role?: OrgRole
  workspaceState?: WorkspaceState
  conversation?: RecordedChatScenario
  banner?: BannerState
  /** The Mac commands of the fake workspace. */
  macCommands?: FakeMacScenario
  /** The window is the Mac app on the Mac of the fake user. */
  onMac?: boolean
  /**
   * `masked` adds two files whose real paths hold a fake secret value, with
   * the labels of the mockups, to the file lists and to each finished turn.
   */
  paths?: PathState
}

function routeKey(method: string, path: string): string {
  const url = new URL(path, FAKE_ORIGIN)
  url.searchParams.sort()
  return `${method} ${url.pathname}${url.search}`
}

/**
 * Fetch-compatible, in-memory server for development and tests.
 * Writes return recorded replies. They do not implement backend state changes.
 * Override a reply with json(), empty(), or response() for the next screen state.
 * This module is opt-in. The production Worker never imports it.
 */
export class FakeApiServer implements FakeRouteWriter {
  readonly requests: Request[] = []
  readonly events: FakeWorkspaceEvents
  private readonly replies = new Map<string, Response>()

  constructor(options: FakeApiOptions = {}) {
    const conversation = options.conversation ?? 'history'
    const paths = options.paths ?? 'plain'
    const recorded = recordedChatEvents(conversation)
    const chat =
      paths === 'masked'
        ? withMaskedTurnFiles(recorded, maskedChangedFiles())
        : recorded
    this.events = new FakeWorkspaceEvents([
      ...chat,
      ...recordedFileEvents(FAKE_IDS.workspace, chat.length + 1, paths),
    ])
    fakeCoreRoutes(this, options.role ?? 'admin')
    fakeWorkspaceRoutes(
      this,
      options.workspaceState ?? 'ready',
      conversation,
      paths,
    )
    fakeToolRoutes(this, options.banner ?? 'ready-to-merge', paths)
    const { workspaces, created } = workspaceFixtures(options.workspaceState)
    fakeDeviceRoutes(
      this,
      options.macCommands ?? 'none',
      options.onMac ?? false,
      [
        ...workspaces.workspaces.map((workspace) => workspace.id),
        created.workspace.id,
      ],
    )
  }

  json(method: FakeMethod, path: string, body: unknown, status = 200): void {
    this.response(method, path, Response.json(body, { status }))
  }

  empty(method: FakeMethod, path: string): void {
    this.response(method, path, new Response(null, { status: 204 }))
  }

  response(method: FakeMethod, path: string, response: Response): void {
    this.replies.set(routeKey(method, path), response.clone())
  }

  fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(new URL(String(input), FAKE_ORIGIN), init)
    this.requests.push(request.clone())
    const url = new URL(request.url)
    const key = routeKey(request.method, request.url)
    const response = this.replies.get(key)
    if (response) return response.clone()
    const historyPath = new URL(
      chatHistoryPath(FAKE_IDS.org, FAKE_IDS.workspace, FAKE_IDS.session),
      FAKE_ORIGIN,
    ).pathname
    if (request.method === 'GET' && url.pathname === historyPath) {
      return Response.json(
        this.events.history(Number(url.searchParams.get('after') ?? 0)),
      )
    }
    return Response.json(
      {
        error: {
          code: 'fake_route_missing',
          message: `No fake reply for ${key}`,
        },
      },
      { status: 404 },
    )
  }
}
