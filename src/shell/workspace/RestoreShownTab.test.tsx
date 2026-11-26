// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { readView } from '../../chat/api/read-view'
import type { FilesTab } from '../../files/navigation'
import {
  workspaceViewPath,
  type WorkspaceTab,
} from '../../shared/workspace-view'
import { viewToWire } from '../../shared/workspace-view-wire'
import { workspacePaths } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { settle } from '../test-mount'
import { filesHref } from './files/files-address'
import { bodiesOf } from './kept-test-kit'
import { skillHref } from './skills/skill-address'
import { previewPortHref } from './tools/tool-address'
import { openTab } from './wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, session } = FAKE_IDS
const bare = routes.workspace(org, id)
const diffTab: FilesTab = { kind: 'diff', path: FAKE_FILE_PATH }
const previewTab: WorkspaceTab = { kind: 'preview', port: 3000 }

/** The fake API, whose saved view has `extra` open and `active` active. */
function serverWith(
  extra: readonly WorkspaceTab[],
  active: WorkspaceTab,
  options: ConstructorParameters<typeof FakeApiServer>[0] = {},
): FakeApiServer {
  const server = new FakeApiServer(options)
  const { view: saved } = workspaceFixtures().view
  const view = { ...saved, tabs: [...saved.tabs, ...extra], activeTab: active }
  server.json('GET', workspaceViewPath(org, id), { view: viewToWire(view) })
  return server
}

/** The number of requests with `method` to `path`, a route of the fake API. */
function sent(server: FakeApiServer, method: string, path: string): number {
  const address = new URL(path, FAKE_ORIGIN).href
  return server.requests.filter(
    (request) => request.method === method && request.url === address,
  ).length
}

describe('the restore of the shown tab at a return to the workspace', () => {
  test('a return to the address of the workspace shows the Preview tab that showed, in place of that address', async () => {
    holdAnimationFrames()
    const server = serverWith([previewTab], previewTab)
    const shown = previewPortHref(org, id, 3000)
    const { navigation } = await openTab(server, shown)
    act(() => navigation.push(routes.automations(org)))
    await settle()
    const saves = sent(server, 'PUT', workspaceViewPath(org, id))

    act(() => navigation.push(bare))
    await settle()

    expect({
      history: navigation.history,
      saves: sent(server, 'PUT', workspaceViewPath(org, id)) - saves,
    }).toEqual({
      history: [shown, routes.automations(org), shown],
      saves: 0,
    })
  })

  test('the first show of the address of the workspace shows the saved diff tab, after the read of the view', async () => {
    holdAnimationFrames()
    const server = serverWith([diffTab], diffTab)
    const { navigation } = await openTab(server, bare)
    expect(navigation.history).toEqual([filesHref(org, id, diffTab)])
  })

  test('the first show of the address of the workspace shows the saved skill tab, after the read of the view', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view: saved } = workspaceFixtures().view
    const plans = { agent: 'claude', name: 'plans' } as const
    server.json('GET', workspaceViewPath(org, id), {
      view: {
        ...saved,
        activeTab: null,
        skillTabs: [{ ...plans, place: 2 }],
        activeSkill: plans,
      },
    })
    const { navigation } = await openTab(server, bare)
    expect(navigation.history).toEqual([skillHref(org, id, plans)])
  })

  test('the restored tab of a stopped sandbox starts no Resume after the one of the open', async () => {
    holdAnimationFrames()
    const server = serverWith([diffTab], diffTab, { workspaceState: 'stopped' })
    const { navigation } = await openTab(server, bare)
    expect({
      at: navigation.href(),
      resumes: sent(server, 'POST', workspacePaths.resume(org, id)),
    }).toEqual({ at: filesHref(org, id, diffTab), resumes: 1 })
  })

  test.each([
    {
      name: 'a saved session tab',
      active: { kind: 'session', sessionId: session } as const,
      href: bare,
      viewport: 'desktop' as const,
    },
    {
      name: 'an address of a tool',
      active: diffTab,
      href: routes.workspace(org, id, 'terminal'),
      viewport: 'desktop' as const,
    },
    {
      name: 'a phone',
      active: diffTab,
      href: bare,
      viewport: 'phone' as const,
    },
  ])('$name keeps the address', async ({ active, href, viewport }) => {
    holdAnimationFrames()
    const server = serverWith([diffTab], active)
    const { navigation } = await openTab(server, href, { viewport })
    expect(navigation.history).toEqual([href])
  })

  test('a move back to the address of the workspace from a tab saves the shown session, so a return shows the chat', async () => {
    holdAnimationFrames()
    const server = serverWith([diffTab], diffTab)
    const diff = filesHref(org, id, diffTab)
    const { navigation } = await openTab(server, diff)
    const from = server.requests.length

    act(() => navigation.push(bare))
    await settle()
    const saved = await bodiesOf(
      server,
      'PUT',
      workspaceViewPath(org, id),
      from,
    )
    act(() => navigation.push(routes.automations(org)))
    await settle()
    act(() => navigation.push(bare))
    await settle()

    expect({
      active: readView({ view: saved.at(-1) }).activeTab,
      history: navigation.history,
    }).toEqual({
      active: { kind: 'session', sessionId: session },
      history: [diff, bare, routes.automations(org), bare],
    })
  })

  test('a move away and back before the read of the view keeps the address', async () => {
    holdAnimationFrames()
    const server = serverWith([diffTab], diffTab)
    const held = new HeldRequests(server)
    held.hold('GET', workspaceViewPath(org, id))
    const { navigation } = await openTab(server, bare, { fetch: held.fetch })
    const diff = filesHref(org, id, diffTab)

    act(() => navigation.push(diff))
    await settle()
    act(() => navigation.push(bare))
    await settle()
    held.release('GET', workspaceViewPath(org, id))
    await settle()

    expect(navigation.history).toEqual([bare, diff, bare])
  })
})
