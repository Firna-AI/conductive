// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { ManualDelay, requestLines } from '../../../app/test-kit'
import { routes } from '../../../app/router'
import { pendingJobWait } from '../../../github/barRuns'
import type { WorkspaceEvent } from '../../../shared/events'
import { githubPaths, type BannerState } from '../../../shared/github'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  serveAccess,
  serveMerge,
  serveWork,
} from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  FAKE_GITHUB_HEAD_SHA,
  toolFixtures,
} from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { emit } from '../kept-test-kit'
import { linksTo, openTab } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const checksHref = filesHref(org, id, { kind: 'list', list: 'checks' })
const pullUrl = 'https://github.com/acme/storefront/pull/482'
const capabilityReads = (server: FakeApiServer) =>
  requestLines(server).filter(
    (line) => line === `GET ${githubPaths.capabilities(org, id)}`,
  ).length

function github(state: BannerState): WorkspaceEvent {
  const data = toolFixtures(state)
  return {
    type: 'github.updated',
    banner: data.banner.banner,
    checks: data.checks,
  }
}

/** The text of the alert line under the bar, or null. */
const alertOf = (column: HTMLElement) =>
  column.querySelector('[role="alert"]')?.textContent ?? null

describe('Merge in the pull request bar', () => {
  test('merges the head that the bar shows on one click, shows Merging until GitHub reports the merge, and reads the access once', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWork(server, 'none')
    serveMerge(server, 'merged')
    const delay = new ManualDelay()
    const { view } = await openTab(server, routes.workspace(org, id), {
      delay: delay.delay,
    })
    const column = byLabel('Files and tools', view)

    click(byRole('button', 'Squash and merge', column))
    await settle()
    const merging = queryByRole('button', 'Merging', column) !== null
    await act(() => delay.run(pendingJobWait))
    await settle()
    emit(server, github('merged'))
    await settle()

    const start = server.requests.find(
      (request) => new URL(request.url).pathname === githubPaths.merge(org, id),
    )
    expect({
      merging,
      body: await start?.clone().json(),
      merged: (column.textContent ?? '').includes('Merged into main'),
      continues: queryByRole('button', 'Continue', column) !== null,
      reads: capabilityReads(server),
    }).toEqual({
      merging: true,
      body: { headSha: FAKE_GITHUB_HEAD_SHA, method: 'squash' },
      merged: true,
      continues: true,
      reads: 1,
    })
  })

  test('names each refusal under the bar until a newer state, and hides Merge after a missing right', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWork(server, 'none')
    const { view } = await openTab(server, routes.workspace(org, id))
    const column = byLabel('Files and tools', view)
    const press = async () => {
      click(byRole('button', 'Squash and merge', column))
      await settle()
    }

    serveMerge(server, 'moved-head')
    await press()
    const movedHead = alertOf(column)
    emit(server, github('ready-to-merge'))
    await settle()
    const cleared = alertOf(column)
    serveMerge(server, 'refused')
    await press()
    const refused = {
      text: alertOf(column),
      links: linksTo(column, pullUrl).length,
    }
    emit(server, github('ready-to-merge'))
    await settle()
    serveAccess(server, 'read')
    serveMerge(server, 'no-right')
    await press()

    expect({
      movedHead,
      cleared,
      refused,
      noRight: alertOf(column),
      merge: queryByRole('button', 'Squash and merge', column),
    }).toEqual({
      movedHead:
        'Not merged: the branch has new commits. Review them, then merge again.',
      cleared: null,
      refused: { text: 'GitHub refused the merge.Open on GitHub', links: 2 },
      noRight: "Not merged: your GitHub access doesn't allow merges into main.",
      merge: null,
    })
  })

  test('on a phone, the actions and the link to GitHub top the Checks tab, and the row stays one link', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWork(server, 'none')
    const { view } = await openTab(server, checksHref, { viewport: 'phone' })

    const actions = queryByLabel('Pull request actions', view)
    const inside = actions ?? document.createElement('div')
    const rows = linksTo(view, checksHref).filter((link) =>
      (link.textContent ?? '').includes('Show the checks'),
    )
    expect({
      group: actions !== null,
      merge: queryByRole('button', 'Squash and merge', inside) !== null,
      links: linksTo(inside, pullUrl).length,
      rows: rows.map((row) => row.querySelectorAll('button').length),
    }).toEqual({ group: true, merge: true, links: 1, rows: [0] })
  })
})
