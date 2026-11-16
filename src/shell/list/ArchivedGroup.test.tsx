import type { Workspace } from '../../shared/generated/Workspace'
// @vitest-environment happy-dom

import { act, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { groupWorkspaces } from '../../app/sections'
import { ManualDelay } from '../../app/test-kit'
import type { Section } from '../../shared/sections'

import { WORKSPACE_RESTORE_MS, workspacesPath } from '../../shared/workspaces'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { removedWorkspace } from '../../test-support/fixtures/removed-workspace'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { SectionList } from './SectionList'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const general: Section = {
  id: 'general',
  orgId: FAKE_IDS.org,
  name: 'General',
  position: 0,
  isDefault: true,
  collapsed: false,
}
/**
 * The fixture list in one section, with one workspace archived a minute
 * ago, and one removed workspace, whose 14 days ended.
 */
const start: readonly Workspace[] = [
  ...workspaceFixtures()
    .workspaces.workspaces.slice(0, 4)
    .map((item, index): Workspace =>
      index === 3
        ? {
            ...item,
            sectionId: general.id,
            state: 'archived',
            archivedAt: FAKE_TIME - 60_000,
          }
        : { ...item, sectionId: general.id },
    ),
  { ...removedWorkspace(), sectionId: general.id },
]
const [first, second, , kept, removed] = start as Workspace[]

const noActions = {
  toggle: () => undefined,
  rename: () => undefined,
  moveTo: () => undefined,
  newWorkspace: () => undefined,
  newSection: () => undefined,
  remove: () => undefined,
}

/** The list with the open workspace and the rows that the test changes. */
async function mountList() {
  const app = await startedApp(new FakeApiServer())
  const set: {
    open?: (id: string) => void
    archive?: (id: string) => void
  } = {}
  function Harness() {
    const [selectedId, setSelectedId] = useState(first?.id ?? null)
    const [rows, setRows] = useState(start)
    set.open = setSelectedId
    set.archive = (id) =>
      setRows((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, state: 'archived', archivedAt: FAKE_TIME }
            : item,
        ),
      )
    const groups = groupWorkspaces([general], rows, FAKE_TIME)
    return (
      <SectionList
        actions={noActions}
        archived={groups.archived}
        groups={groups.sections}
        move={() => undefined}
        now={FAKE_TIME}
        readOnly={false}
        selectedId={selectedId}
        variant="sidebar"
      />
    )
  }
  const view = mountScreen(app, <Harness />)
  await settle()
  const toggle = () =>
    byRole('region', 'Archived', view).querySelector('button')
  return {
    open: (id: string) => act(() => set.open?.(id)),
    archive: (id: string) => act(() => set.archive?.(id)),
    expanded: () => toggle()?.getAttribute('aria-expanded'),
    toggle: () => click(toggle() as HTMLElement),
    /** The name and the count that the closed group shows. */
    heading: () => toggle()?.textContent,
    /** The rows that show as the open workspace. */
    selected: () => view.querySelectorAll('[aria-current="page"]').length,
  }
}

describe('the Archived group', () => {
  test('stays as it was when the open workspace is archived, opens for a workspace that is archived when it opens, and leaves out a removed workspace that a link opens', async () => {
    if (!first || !second || !kept || !removed) {
      throw new Error('The fixture is short.')
    }
    const list = await mountList()
    const before = list.expanded()
    list.archive(first.id)
    const archivedClosed = list.expanded()
    list.open(kept.id)
    const openedArchived = list.expanded()
    list.open(second.id)
    const left = list.expanded()
    list.open(removed.id)
    const removedOpen = {
      expanded: list.expanded(),
      heading: list.heading(),
      selected: list.selected(),
    }
    list.toggle()
    list.archive(second.id)
    const archivedOpen = list.expanded()
    expect({
      before,
      archivedClosed,
      openedArchived,
      left,
      removedOpen,
      archivedOpen,
    }).toEqual({
      before: 'false',
      archivedClosed: 'false',
      openedArchived: 'true',
      left: 'false',
      removedOpen: { expanded: 'false', heading: 'Archived2', selected: 0 },
      archivedOpen: 'true',
    })
  })

  test('a workspace leaves the group and its count when its 14 days end, also without a kept cloud computer, with no other event', async () => {
    holdAnimationFrames()
    let now = FAKE_TIME
    const timers = new ManualDelay()
    const [ending, recent, ...rest] = workspaceFixtures().workspaces.workspaces
    if (!ending || !recent) throw new Error('The fixture is short.')
    const server = new FakeApiServer()
    server.json('GET', workspacesPath(FAKE_IDS.org), {
      workspaces: [
        ...rest,
        {
          ...ending,
          state: 'archived',
          archivedAt: FAKE_TIME - WORKSPACE_RESTORE_MS + 60_000,
          restoreUntil: null,
        },
        {
          ...recent,
          state: 'archived',
          archivedAt: FAKE_TIME,
          restoreUntil: FAKE_TIME + WORKSPACE_RESTORE_MS,
        },
      ],
    })
    const app = await startedApp(server, {
      now: () => now,
      delay: timers.delay,
    })
    const navigation = memoryNavigation(routes.org(FAKE_IDS.org))
    const view = mountScreen(app, <Shell />, { navigation })
    await settle()
    const heading = () =>
      byRole('region', 'Archived', byLabel('Workspaces', view)).querySelector(
        'button',
      )?.textContent
    const listed = heading()
    now = FAKE_TIME + 60_000
    await act(() => timers.run(60_000))
    await settle()
    expect({ listed, ended: heading() }).toEqual({
      listed: 'Archived2',
      ended: 'Archived1',
    })
  })
})
