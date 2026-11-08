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
import { click, settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { emit } from '../kept-test-kit'
import { linksTo, linkTo, openTab } from '../wiring-test-kit'

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
})
