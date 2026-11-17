// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { sessionPaths } from '../../../shared/sessions'
import { accessibleName } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveAccess, serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import {
  openPaletteTab,
  options,
  searchField,
} from '../../palette/palette-test-kit'
import { pressCommand } from '../../shortcuts/shortcut-test-kit'
import { click, settle, typeText } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, session } = FAKE_IDS
const mergeLatest =
  'Fetch `origin/main` and merge it into this branch. If the branch already has every commit of `origin/main`, say so and stop. Otherwise resolve each conflict, run the tests, then commit and push.'

/** Opens the palette over the workspace and searches for Merge latest. */
async function searchMergeLatest(server: FakeApiServer) {
  await openPaletteTab(routes.workspace(org, id), {
    server,
    events: socketsOf(server).events,
  })
  pressCommand('command-palette', 'other', document.body)
  typeText(searchField(), 'merge latest')
  await settle()
  return options().filter((option) =>
    accessibleName(option).startsWith('Merge latest'),
  )
}

describe('Merge latest in the palette', () => {
  test('names the target branch, and sends its prompt to the session that the member saw last', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'ready-to-merge' })
    serveWork(server, 'none')
    const rows = await searchMergeLatest(server)
    const names = rows.map(accessibleName)

    const [row] = rows
    if (row) click(row)
    await settle()
    const sends = await bodiesOf(
      server,
      'POST',
      sessionPaths.messages(org, id, session),
      0,
    )

    expect({
      names: names.map((name) => name.startsWith('Merge latest main')),
      sends: sends.map((body) => Object(body).text),
    }).toEqual({ names: [true], sends: [mergeLatest] })
  })

  test.each([
    {
      who: 'a member who may only read the repository',
      banner: 'ready-to-merge',
      access: 'read',
    },
    { who: 'a merged pull request', banner: 'merged', access: 'write' },
  ] as const)('does not show for $who', async ({ banner, access }) => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner })
    serveWork(server, 'none')
    serveAccess(server, access)
    expect(await searchMergeLatest(server)).toEqual([])
  })
})
