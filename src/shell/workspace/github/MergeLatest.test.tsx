// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { FetchLike } from '../../../app/api/client'
import { routes } from '../../../app/router'
import { HeldRequests } from '../../../app/test-kit'
import { githubPaths } from '../../../shared/github'
import { sessionPaths } from '../../../shared/sessions'
import { accessibleName } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveAccess, serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { MASKED_BASE } from '../../../test-support/fixtures/masked-paths'
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
import { bodiesOf, savedViewsOf } from '../kept-test-kit'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, session } = FAKE_IDS
const sends = (server: FakeApiServer) =>
  bodiesOf(server, 'POST', sessionPaths.messages(org, id, session), 0)

/** The target of a pull request: its real name, and its label if any. */
type Target = { baseBranch: string; displayBaseBranch?: string }

/**
 * A pull request into `release/2026` by default, while the default branch
 * of the repository stays `main`, so a row that names `main` fails.
 */
function serveReleaseTarget(
  server: FakeApiServer,
  target: Target = { baseBranch: 'release/2026' },
): void {
  const {
    banner: { banner },
    checks,
  } = toolFixtures('ready-to-merge')
  server.json('GET', githubPaths.banner(org, id), {
    banner: { ...banner, ...target },
  })
  server.json('GET', githubPaths.stored(org, id), {
    state: { banner: { ...banner, ...target }, checks },
  })
}

/**
 * Opens the palette over the page and searches for Merge latest. `fetch`
 * is the fetch of the app, such as one of `HeldRequests`.
 */
async function searchMergeLatest(
  server: FakeApiServer,
  address = routes.workspace(org, id),
  fetch?: FetchLike,
) {
  const tab = await openPaletteTab(address, {
    server,
    events: socketsOf(server).events,
    fetch,
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
  test.each([
    {
      target: 'the target branch',
      reply: { baseBranch: 'release/2026' },
      name: 'Merge latest release/2026',
      prompt:
        'Fetch `origin/release/2026` and merge it into this branch. If the branch already has every commit of `origin/release/2026`, say so and stop. Otherwise resolve each conflict, run the tests, then commit and push.',
    },
    {
      target: 'the label of a target branch that holds a secret value',
      reply: MASKED_BASE,
      name: 'Merge latest release/[redacted]',
      prompt:
        'Fetch `origin/release/acme-7f3k` and merge it into this branch. If the branch already has every commit of `origin/release/acme-7f3k`, say so and stop. Otherwise resolve each conflict, run the tests, then commit and push.',
    },
  ])(
    'names $target, and sends its prompt with the real name to the session that the member saw last',
    async ({ reply, name, prompt }) => {
      holdAnimationFrames()
      const server = new FakeApiServer({ banner: 'ready-to-merge' })
      serveWork(server, 'none')
      serveReleaseTarget(server, reply)
      const { rows } = await searchMergeLatest(server)
      const names = rows.map(accessibleName)

      const [row] = rows
      if (row) click(row)
      await settle()

      expect({
        names,
        sends: (await sends(server)).map((body) => Object(body).text),
      }).toEqual({ names: [name], sends: [prompt] })
    },
  )

  test('asks for a rebase when the stored queue is newer than the palette row', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'ready-to-merge' })
    serveWork(server, 'none')
    serveReleaseTarget(server)
    const { rows } = await searchMergeLatest(server)
    expect(rows.map(accessibleName)).toEqual(['Merge latest release/2026'])
    server.json('GET', githubPaths.stored(org, id), {
      state: null,
      queue: {
        place: 2,
        count: 2,
        belowPullNumber: 479,
        trunk: 'main',
        state: 'queued',
        wait: null,
        rebase: {
          base: 'calummoore/apple-pay-secret123',
          label: { text: 'calummoore/apple-pay-[redacted]' },
          baseHead: 'b'.repeat(40),
          oldBase: 'a'.repeat(40),
        },
      },
    })
    const [row] = rows
    if (row) click(row)
    await settle()
    const [request] = await sends(server)
    const text: unknown = Object(request).text
    expect(text).toEqual(
      expect.stringContaining(
        `git rebase --onto ${'b'.repeat(40)} ${'a'.repeat(40)}`,
      ),
    )
    expect(text).toEqual(
      expect.stringContaining('git fetch origin refs/pull/479/head'),
    )
    expect(text).toEqual(
      expect.stringContaining(
        'git push --force-with-lease --force-if-includes',
      ),
    )
    expect(text).toEqual(
      expect.stringContaining('calummoore/apple-pay-[redacted]'),
    )
    expect(text).not.toEqual(expect.stringContaining('secret123'))
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

  test('a send that fails after the member left the workspace keeps the page that the member chose, and the tab that the workspace saved', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'ready-to-merge' })
    serveWork(server, 'none')
    serveReleaseTarget(server)
    const path = sessionPaths.messages(org, id, session)
    const error = { code: 'unavailable', message: 'The Worker did not answer.' }
    server.json('POST', path, { error }, 503)
    const held = new HeldRequests(server)
    held.holdAnswer('POST', path)
    const file = filesHref(org, id, {
      kind: 'file',
      path: FAKE_FILE_PATH,
      mode: 'preview',
    })
    const { rows, navigation } = await searchMergeLatest(
      server,
      file,
      held.fetch,
    )
    const [row] = rows
    if (row) click(row)
    await settle()
    act(() => navigation.push(routes.automations(org)))
    await settle()
    const from = server.requests.length

    held.release('POST', path)
    await settle()
    const views = await savedViewsOf(server, from)
    // A return shows the tab that the workspace saved, in place of its address.
    act(() => navigation.push(routes.workspace(org, id)))
    await settle()

    expect({
      rows: rows.length,
      sends: (await sends(server)).length,
      views,
      history: navigation.history,
    }).toEqual({
      rows: 1,
      sends: 1,
      views: [],
      history: [file, routes.automations(org), file],
    })
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
