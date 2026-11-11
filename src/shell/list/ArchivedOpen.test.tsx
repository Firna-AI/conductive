// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { recordingSocket } from '../workspace/kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const open = FAKE_IDS.workspace
const other = 'invoice-fonts'

describe('the Archived group', () => {
  test('keeps its state when the open workspace is archived, and opens when the user goes to an archived workspace', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
    })
    const navigation = memoryNavigation(routes.workspace(org, open))
    const view = mountScreen(app, <Shell />, { navigation })
    await settle()
    const list = () => byLabel('Workspaces', view)
    const toggle = () =>
      byRole('region', 'Archived', list()).querySelector('button')
    const expanded = () => toggle()?.getAttribute('aria-expanded') ?? null
    const archive = async (workspaceId: string) => {
      const row = list()
        .querySelector(`a[href="${routes.workspace(org, workspaceId)}"]`)
        ?.closest('li')
      if (!row) throw new Error(`The list has no row for ${workspaceId}.`)
      click(byRole('button', 'Archive workspace', row))
      await settle()
    }
    const go = async (workspaceId: string) => {
      act(() => navigation.push(routes.workspace(org, workspaceId)))
      await settle()
    }

    // The Archive of the open workspace keeps the group collapsed.
    await archive(open)
    const archivedOpen = expanded()
    // A move to the archived workspace opens the group.
    await go(other)
    const leftArchived = expanded()
    await go(open)
    const backToArchived = expanded()
    // The user's choice stays when the open workspace is archived.
    await go(other)
    const toggleButton = toggle()
    if (toggleButton) click(toggleButton)
    const userOpened = expanded()
    await archive(other)
    expect({
      archivedOpen,
      leftArchived,
      backToArchived,
      userOpened,
      archivedOther: expanded(),
      history: navigation.history.at(-1),
    }).toEqual({
      archivedOpen: 'false',
      leftArchived: 'false',
      backToArchived: 'true',
      userOpened: 'true',
      archivedOther: 'true',
      history: routes.workspace(org, other),
    })
  })
})
