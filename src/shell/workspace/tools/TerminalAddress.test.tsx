// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { readView } from '../../../chat/api/read-responses'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { queryByLabel, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { bodiesOf } from '../kept-test-kit'
import { openTab, socketsOf } from '../wiring-test-kit'
import { firstTerminal, openTerminals, terminalTabs } from './terminal-tabs-kit'
import { terminalHref, toolHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const viewPath = workspaceViewPath(org, id)

/** The shown terminal of a saved view, read as the view route reads it. */
const terminalOf = (body: unknown) => readView({ view: body }).terminal

/** A terminal ID that no terminal of the list has, such as a closed one. */
const closed = 'f'.repeat(32)

/** The name of each terminal on its tab. */
const names = {
  first: 'Terminal 1',
  second: 'Terminal 2',
  third: 'Terminal 3',
} as const

describe('the shown terminal of the saved view and of the address', () => {
  test.each([
    {
      entry: 'a saved terminal shows that terminal',
      address: 'tool',
      saved: 'third',
      shown: 'third',
      saves: [],
    },
    {
      entry: 'a saved terminal that is not in the list shows the first one',
      address: 'tool',
      saved: 'closed',
      shown: 'first',
      saves: [],
    },
    {
      entry: 'an address that names a terminal shows it, and the view saves it',
      address: 'second',
      saved: 'third',
      shown: 'second',
      saves: ['second'],
    },
  ] as const)(
    'after a reload, $entry, and only the shown terminal connects',
    async ({ address, saved, shown, saves }) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      const [second, third] = await openTerminals(server, 2)
      const terminals = { first: firstTerminal, second, third }
      const ids = { second: second.id, third: third.id, closed }
      server.json('GET', viewPath, {
        view: { ...workspaceFixtures().view.view, terminal: ids[saved] },
      })
      const { events, opened } = socketsOf(server)
      const href =
        address === 'tool'
          ? toolHref(org, id, 'terminal')
          : terminalHref(org, id, second.id)
      const { view } = await openTab(server, href, { events })

      expect(terminalTabs(view).shown).toEqual([names[shown]])
      expect(opened.map(({ path }) => path)).toEqual([
        terminals[shown].socketPath,
      ])
      const writes = await bodiesOf(server, 'PUT', viewPath, 0)
      expect(writes.map(terminalOf)).toEqual(saves.map((name) => ids[name]))
    },
  )

  test('a workspace without the attach program shows its one terminal, with no row of tabs', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ terminalSeveral: false })
    const { events, opened } = socketsOf(server)
    const { view } = await openTab(server, toolHref(org, id, 'terminal'), {
      events,
    })

    expect({
      row: queryByLabel('Terminals', view),
      plus: queryByRole('button', 'New terminal', view),
      sockets: opened.map(({ path }) => path),
    }).toEqual({ row: null, plus: null, sockets: [firstTerminal.socketPath] })
  })
})
