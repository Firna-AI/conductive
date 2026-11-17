// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { githubPaths } from '../../../shared/github'
import { sessionPaths } from '../../../shared/sessions'
import { accessibleName } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveAccess, serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  FAKE_FILE_PATH,
  toolFixtures,
} from '../../../test-support/fixtures/tools'
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
import { filesHref } from '../files/files-address'
import { bodiesOf } from '../kept-test-kit'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, session } = FAKE_IDS
const mergeLatest =
  'Fetch `origin/release/2026` and merge it into this branch. If the branch already has every commit of `origin/release/2026`, say so and stop. Otherwise resolve each conflict, run the tests, then commit and push.'
const sends = (server: FakeApiServer) =>
  bodiesOf(server, 'POST', sessionPaths.messages(org, id, session), 0)

/**
 * A pull request into `release/2026`, while the default branch of the
 * repository stays `main`, so a row that names `main` fails.
 */
function serveReleaseTarget(server: FakeApiServer): void {
  const { banner } = toolFixtures('ready-to-merge').banner
  server.json('GET', githubPaths.banner(org, id), {
    banner: { ...banner, baseBranch: 'release/2026' },
  })
}

/** Opens the palette over the page and searches for Merge latest. */
async function searchMergeLatest(
  server: FakeApiServer,
  address = routes.workspace(org, id),
) {
  const tab = await openPaletteTab(address, {
    server,
    events: socketsOf(server).events,
  })
  pressCommand('command-palette', 'other', document.body)
  typeText(searchField(), 'merge latest')
  await settle()
  const rows = options().filter((option) =>
    accessibleName(option).startsWith('Merge latest'),
  )
  return { ...tab, rows }
}

describe('Merge latest in the palette', () => {
  test('names the target branch, and sends its prompt to the session that the member saw last', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'ready-to-merge' })
    serveWork(server, 'none')
    serveReleaseTarget(server)
    const { rows } = await searchMergeLatest(server)
    const names = rows.map(accessibleName)

    const [row] = rows
    if (row) click(row)
    await settle()

    expect({
      names,
      sends: (await sends(server)).map((body) => Object(body).text),
    }).toEqual({ names: ['Merge latest release/2026'], sends: [mergeLatest] })
  })

  test('a send that fails shows the chat of the session, whose composer names the cause', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'ready-to-merge' })
    serveWork(server, 'none')
    serveReleaseTarget(server)
    const refused = {
      code: 'unavailable',
      message: 'The Worker did not answer.',
    }
    server.json(
      'POST',
      sessionPaths.messages(org, id, session),
      { error: refused },
      503,
    )
    const fileTab = {
      kind: 'file',
      path: FAKE_FILE_PATH,
      mode: 'preview',
    } as const
    const { rows, navigation, view } = await searchMergeLatest(
      server,
      filesHref(org, id, fileTab),
    )

    const [row] = rows
    if (row) click(row)
    await settle()

    expect({
      rows: rows.length,
      address: navigation.href(),
      notice: (view.textContent ?? '').includes("Your message didn't send"),
    }).toEqual({ rows: 1, address: routes.workspace(org, id), notice: true })
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
    expect((await searchMergeLatest(server)).rows).toEqual([])
  })
})
