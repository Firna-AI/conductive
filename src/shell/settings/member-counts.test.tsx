// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { ManualDelay } from '../../app/test-kit'
import { WORKSPACE_RESTORE_MS, workspacesPath } from '../../shared/workspaces'
import { queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgTabContent } from './OrgTabContent'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The workspace count in the row of Priya Raman. */
function priyaCount(list: HTMLElement): string | undefined {
  const row = Array.from(list.querySelectorAll(':scope > li')).find((item) =>
    item.textContent?.includes('Priya Raman'),
  )
  return /\d+ workspaces?/.exec(row?.textContent ?? '')?.[0]
}

test('a member count leaves out a workspace when its 14 days end, at that moment and with no other event', async () => {
  holdAnimationFrames()
  let now = FAKE_TIME
  const timers = new ManualDelay()
  const { workspaces } = workspaceFixtures().workspaces
  const ending = workspaces.find((item) => item.owner.id === 'priya')
  if (!ending) throw new Error('The fixture has no workspace of Priya.')
  const server = new FakeApiServer()
  server.json('GET', workspacesPath(FAKE_IDS.org), {
    workspaces: workspaces.map((item) =>
      item.id === ending.id
        ? {
            ...item,
            state: 'archived',
            archivedAt: FAKE_TIME - WORKSPACE_RESTORE_MS + 60_000,
            restoreUntil: null,
          }
        : item,
    ),
  })
  const app = await startedApp(server, {
    now: () => now,
    delay: timers.delay,
  })
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OrgTabContent org={acme} tab="members" user={boot.user} />,
  )
  const list = await waitFor(
    () => queryByRole('list', 'Members', view),
    'the members of Acme',
  )
  await settle()
  const before = priyaCount(list)
  // Only the deadline of the removal moves the time: the minute clock of the
  // invite ages runs on its own timer, which this test never fires.
  now = FAKE_TIME + 60_000
  await act(() => timers.run(60_000))
  await settle()
  const owned = workspaces.filter((item) => item.owner.id === 'priya').length
  const count = (total: number) =>
    `${total} ${total === 1 ? 'workspace' : 'workspaces'}`
  expect({ before, after: priyaCount(list) }).toEqual({
    before: count(owned),
    after: count(owned - 1),
  })
})
