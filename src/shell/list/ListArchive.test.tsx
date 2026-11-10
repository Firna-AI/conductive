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
  byToast,
  queryByRole,
  shownToasts,
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
  test('archives another workspace at once, without opening it, brings it back from its toast, keeps Archive out of the header, and ends an Archive that runs when the org changes', async () => {
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
    const rowOf = (workspaceId: string) =>
      byLabel('Workspaces', view)
        .querySelector(
          `a[href="${routes.workspace(FAKE_IDS.org, workspaceId)}"]`,
        )
        ?.closest('li') ?? null
    const sectionOf = (workspaceId: string) =>
      rowOf(workspaceId)?.closest('section')?.getAttribute('aria-label')
    const section = sectionOf(target)
    const archive = byRole('button', 'Archive workspace', rowOf(target) ?? view)
    expect(archive.closest('a')).toBeNull()
    const writes = (action: 'archive' | 'restore', workspaceId = target) =>
      server.requests.filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname ===
            workspacePaths[action](FAKE_IDS.org, workspaceId),
      )
    const dialogs = () =>
      Array.from(document.querySelectorAll('[role="dialog"]'), accessibleName)

    // One press archives the workspace, with no question.
    click(archive)
    await settle()
    const archived = byRole('region', 'Archived', view)
    click(byRole('button', 'Archived1', archived))
    const done = {
      dialogs: dialogs(),
      writes: writes('archive').length,
      body: await writes('archive')[0]?.clone().json(),
      history: [...navigation.history],
      section: sectionOf(target),
      toasts: shownToasts().map((toast) => toast.textContent),
    }
    click(
      byRole('button', 'Restore', byToast('Invoice PDF fonts is archived.')),
    )
    await settle()
    const restored = {
      writes: writes('restore').length,
      section: sectionOf(target),
      archived: queryByRole('region', 'Archived', view),
    }

    // Another org takes the place of Acme while an Archive runs. The Archive
    // ends in Acme, and no question shows in either org.
    held.holdAnswer(
      'POST',
      workspacePaths.archive(FAKE_IDS.org, 'pricing-copy'),
    )
    click(byRole('button', 'Archive workspace', rowOf('pricing-copy') ?? view))
    await settle()
    const running = dialogs()
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
    held.release('POST', workspacePaths.archive(FAKE_IDS.org, 'pricing-copy'))
    await settle()
    act(() => navigation.push(href))
    await settle()
    expect({
      done,
      restored,
      orgChange: {
        running,
        otherOrg,
        writes: writes('archive', 'pricing-copy').length,
        back: dialogs(),
        toast: byToast('Pricing page copy is archived.').textContent,
      },
    }).toEqual({
      done: {
        dialogs: [],
        writes: 1,
        body: {},
        history: [href],
        section: 'Archived',
        toasts: ['Invoice PDF fonts is archived.Restore'],
      },
      restored: { writes: 1, section, archived: null },
      orgChange: {
        running: [],
        otherOrg: [],
        writes: 1,
        back: [],
        toast: 'Pricing page copy is archived.Restore',
      },
    })
  })
})
