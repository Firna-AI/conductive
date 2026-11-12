// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../../app/test-kit'
import { routes } from '../../../app/router'
import { githubPaths } from '../../../shared/github'
import { byLabel, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import {
  orgSuspendedBody,
  serveSuspendedAcme,
} from '../../../test-support/suspended-org'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { pressHintKey } from '../../shortcuts/shortcut-test-kit'
import { click, settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { emit } from '../kept-test-kit'
import { linksTo, linkTo, openTab, socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const checksHref = filesHref(org, id, { kind: 'list', list: 'checks' })

describe('the GitHub state in the workspace', () => {
  test('one read feeds the pull request bar and the Checks tab, and a live event changes both', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = await openTab(server, routes.workspace(org, id))
    const column = byLabel('Files and tools', view)
    click(linkTo(column, checksHref))
    await settle()

    const bannerReads = requestLines(server).filter(
      (line) => line === `GET ${githubPaths.banner(org, id)}`,
    )
    expect(bannerReads).toHaveLength(1)
    expect(column.textContent).toContain('Ready to merge')
    const failed = toolFixtures('checks-failed')
    emit(server, {
      type: 'github.updated',
      banner: failed.banner.banner,
      checks: failed.checks,
    })
    expect(column.textContent).toContain('2 checks failed')
    expect(column.textContent).toContain('2 of 6 failed')
  })

  test('the key of Open PR on GitHub opens the pull request in a new tab while the bar links it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const opened: string[] = []
    const { app } = await openPaletteTab(routes.workspace(org, id), {
      server,
      events: socketsOf(server).events,
      openInNewTab: (url) => opened.push(url),
    })
    const linked = pressHintKey(app, 'open-pull-request', document.body)
    await settle()
    // A branch without a pull request has no link to one.
    const none = toolFixtures('none')
    emit(server, {
      type: 'github.updated',
      banner: none.banner.banner,
      checks: none.checks,
    })
    const unlinked = pressHintKey(app, 'open-pull-request', document.body)
    await settle()

    expect({
      linked: linked.defaultPrevented,
      unlinked: unlinked.defaultPrevented,
      opened,
    }).toEqual({
      linked: true,
      unlinked: false,
      opened: ['https://github.com/acme/storefront/pull/482'],
    })
  })

  test('on a phone, the pull request row opens the Checks tab', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
      { viewport: 'phone' },
    )

    click(linkTo(view, checksHref))
    await settle()

    expect(navigation.href()).toBe(checksHref)
    expect(view.textContent).toContain('e2e (webkit)')
  })

  test('on a phone, an archived workspace shows only its chat, with no pull request row and no GitHub read', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'archived' })
    const { view } = await openTab(server, routes.workspace(org, id), {
      viewport: 'phone',
    })

    expect(queryByRole('region', 'Chat', view)).not.toBeNull()
    expect(linksTo(view, checksHref)).toEqual([])
    const githubReads = requestLines(server).filter((line) =>
      line.startsWith(`GET ${githubPaths.banner(org, id)}`),
    )
    expect(githubReads).toEqual([])
  })

  test('in a suspended org, the bar of a merged pull request offers no Archive', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'merged' })
    serveSuspendedAcme(server)
    const { view } = await openTab(server, routes.workspace(org, id))
    const column = byLabel('Files and tools', view)
    expect({
      merged: (column.textContent ?? '').includes('Merged into'),
      archive: queryByRole('button', 'Archive', column),
    }).toEqual({ merged: true, archive: null })
  })

  test('a GitHub read that the API refuses as suspended marks the org, also while the org list shows it in use', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', githubPaths.banner(org, id), orgSuspendedBody, 403)
    const { view } = await openTab(server, routes.workspace(org, id))
    const text = view.textContent ?? ''
    expect({
      refused: text.includes("The sandbox can't start"),
      words: text.includes(orgSuspendedBody.error.message),
    }).toEqual({ refused: true, words: true })
  })
})
