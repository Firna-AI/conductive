// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { orgEntry, type WorkspaceRoute } from '../app/last-workspaces'
import { memoryNavigation, NavigationContext } from '../app/navigation'
import { actionGroups } from '../app/palette/palette-groups'
import { source } from '../app/palette/results-test-kit'
import { routes } from '../app/router'
import type { AppModel } from '../app/app-model'
import { API_PATHS } from '../shared/api'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../test-support/mount'
import { OrgRail } from './layout/OrgRail'
import { openPaletteTab, options } from './palette/palette-test-kit'
import { pressCommand, pressHintKey } from './shortcuts/shortcut-test-kit'
import { settle } from './test-mount'
import { Shell } from './Shell'
import { mountScreen } from './test-mount'
import { startedApp } from './test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

function workspace(orgId: string, workspaceId: string): WorkspaceRoute {
  return { screen: 'workspace', orgId, workspaceId, view: ['files'] }
}

/** The shell at `address`, over the app. */
function openShell(app: AppModel, address: string) {
  const navigation = memoryNavigation(address)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  return { navigation, view }
}

describe('the last workspace of each org', () => {
  test('the tile of an org links to its last workspace, and an org without one to its list', async () => {
    const app = await startedApp(new FakeApiServer())
    const boot = app.boot.get()
    if (boot.state !== 'ready') throw new Error('The app did not start.')
    app.lastWorkspaces.remember(workspace('futex', 'ws-1'))
    const view = mountScreen(
      app,
      <OrgRail
        current={{ org: 'acme' }}
        firstRun={false}
        operator={false}
        orgs={app.orgs.get()}
        user={boot.user}
      />,
    )
    const hrefs = Array.from(view.querySelectorAll('a'), (link) =>
      link.getAttribute('href'),
    )
    expect(hrefs).toContain('/orgs/futex/workspaces/ws-1/files')
    expect(hrefs).toContain(routes.org('firna'))
  })

  test('a Switch to row of the palette leads where the tile leads', async () => {
    const app = await startedApp(new FakeApiServer())
    app.lastWorkspaces.remember(workspace('futex', 'ws-1'))
    const state = app.lastWorkspaces.state.get()
    const groups = actionGroups(
      source({ orgHref: (orgId) => orgEntry(state, orgId) }),
    )
    const hrefs = groups
      .flatMap((group) => group.rows)
      .flatMap((row) =>
        row.kind === 'command' && row.key.startsWith('switch:')
          ? [row.href]
          : [],
      )
    expect(hrefs).toEqual([
      '/orgs/futex/workspaces/ws-1/files',
      routes.org('firna'),
    ])
  })

  test('Switch to org 2 opens the last workspace of the second org', async () => {
    holdAnimationFrames()
    const { app, navigation } = await openPaletteTab(routes.org('acme'))
    app.lastWorkspaces.remember(workspace('futex', 'ws-1'))
    await settle()
    pressHintKey(app, 'org-2', document.body)
    await settle()
    expect(navigation.href()).toBe('/orgs/futex/workspaces/ws-1/files')
  })

  test('the Switch to row of the open palette leads to the last workspace', async () => {
    holdAnimationFrames()
    const { app } = await openPaletteTab(routes.org('acme'))
    app.lastWorkspaces.remember(workspace('futex', 'ws-1'))
    await settle()
    pressCommand('command-palette', 'other', document.body)
    await settle()
    const hrefs = options().map((option) => option.getAttribute('href'))
    expect(hrefs).toContain('/orgs/futex/workspaces/ws-1/files')
    expect(hrefs).toContain(routes.org('firna'))
  })

  test('the address / opens the workspace that the person opened last', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    const last = workspace(FAKE_IDS.org, FAKE_IDS.workspace)
    app.lastWorkspaces.remember(workspace('futex', 'ws-1'))
    app.lastWorkspaces.remember(last)
    const { navigation } = openShell(app, routes.home())
    await waitFor(
      () =>
        navigation.href() ===
        routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace, 'files'),
      'the last workspace',
    )
  })

  test('the address / opens the first org when the org of the last workspace is deleted', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { orgs } = coreFixtures().orgs
    const deletion = { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 }
    server.json('GET', API_PATHS.orgs, {
      orgs: orgs.map((org) =>
        org.id === 'futex' ? { ...org, deletion } : org,
      ),
    })
    const app = await startedApp(server)
    app.lastWorkspaces.remember(workspace('futex', 'ws-1'))
    const { navigation } = openShell(app, routes.home())
    await waitFor(
      () => navigation.href() === routes.org('acme'),
      'the first org',
    )
  })

  test('the workspace page remembers its workspace', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    const shown = routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace)
    openShell(app, shown)
    await waitFor(
      () => orgEntry(app.lastWorkspaces.state.get(), FAKE_IDS.org) === shown,
      'the remembered workspace',
    )
  })

  test('a workspace that is not available is forgotten', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    app.lastWorkspaces.remember(workspace(FAKE_IDS.org, 'gone'))
    const { view } = openShell(app, routes.workspace(FAKE_IDS.org, 'gone'))
    await waitFor(
      () =>
        view.textContent?.includes('It may have moved to another org.') &&
        orgEntry(app.lastWorkspaces.state.get(), FAKE_IDS.org) ===
          routes.org(FAKE_IDS.org),
      'the forgotten workspace',
    )
  })
})
