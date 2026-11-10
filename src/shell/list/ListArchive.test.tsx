// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { sectionsPath } from '../../shared/sections'
import { workspacePaths, workspacesPath } from '../../shared/workspaces'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
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

describe('Archive from the workspace list', () => {
  test('archives another workspace only after confirmation, without opening it, removes Archive from the header, and drops a question whose check still runs when the org changes', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
      fetch: held.fetch,
    })
    const href = routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace)
    const navigation = memoryNavigation(href)
    const view = mountScreen(app, <Shell />, { navigation })
    await settle()
    const header = view.querySelector('h1')?.closest('header')
    if (!header) throw new Error('The workspace has no header.')
    expect(queryByRole('button', 'Archive workspace', header)).toBeNull()
    const target = 'invoice-fonts'
    const rowOf = (workspaceId: string) => {
      const found = byLabel('Workspaces', view)
        .querySelector(
          `a[href="${routes.workspace(FAKE_IDS.org, workspaceId)}"]`,
        )
        ?.closest('li')
      if (!found) throw new Error('The workspace has no list row.')
      return found
    }
    const row = rowOf(target)
    const archive = byRole('button', 'Archive workspace', row)
    expect(archive.closest('a')).toBeNull()
    const writes = () =>
      server.requests.filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname ===
            workspacePaths.archive(FAKE_IDS.org, target),
      )

    click(archive)
    await settle()
    const title = 'Archive with work that is not pushed?'
    expect(byRole('dialog', title).textContent).toContain('Invoice PDF fonts')
    expect(writes()).toHaveLength(0)
    click(byRole('button', 'Cancel', byRole('dialog', title)))
    expect(queryByRole('dialog', title)).toBeNull()
    expect(writes()).toHaveLength(0)

    click(archive)
    await settle()
    click(byRole('button', 'Archive anyway', byRole('dialog', title)))
    await settle()
    expect(writes()).toHaveLength(1)
    expect(navigation.history).toEqual([href])
    const archived = byRole('region', 'Archived', view)
    click(byRole('button', 'Archived1', archived))
    expect(archived.textContent).toContain('Invoice PDF fonts')
    expect(queryByRole('dialog', title)).toBeNull()

    // Another org takes the place of Acme while a check runs. The question
    // closes, and the answer of its check opens no question in either org.
    const dialogs = () =>
      Array.from(document.querySelectorAll('[role="dialog"]'), accessibleName)
    const check = workspacePaths.archiveCheck(FAKE_IDS.org, 'pricing-copy')
    held.holdAnswer('GET', check)
    click(byRole('button', 'Archive workspace', rowOf('pricing-copy')))
    await settle()
    const checking = dialogs()
    server.json('GET', sectionsPath('futex'), {
      sections: [
        {
          id: 'futex-general',
          orgId: 'futex',
          name: 'General',
          position: 0,
          isDefault: true,
          collapsed: false,
        },
      ],
    })
    server.json('GET', workspacesPath('futex'), { workspaces: [] })
    act(() => navigation.push(routes.org('futex')))
    await settle()
    const otherOrg = dialogs()
    held.release('GET', check)
    await settle()
    const afterCheck = dialogs()
    act(() => navigation.push(href))
    await settle()
    expect({ checking, otherOrg, afterCheck, back: dialogs() }).toEqual({
      checking: ['Archive Pricing page copy?'],
      otherOrg: [],
      afterCheck: [],
      back: [],
    })
  })
})
