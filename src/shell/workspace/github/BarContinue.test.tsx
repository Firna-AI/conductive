// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { ManualDelay } from '../../../app/test-kit'
import { routes } from '../../../app/router'
import { pendingJobWait } from '../../../github/barRuns'
import { workspacePaths } from '../../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  CONTINUED_BRANCH,
  continuedEvents,
  continuedReply,
  serveContinue,
  serveWork,
} from '../../../test-support/fake-bar'
import { FAKE_IDS, fakeUsers } from '../../../test-support/fixtures/core'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle, typeText } from '../../test-mount'
import {
  bodiesOf,
  draftOf,
  emit,
  isOff,
  lastEvent,
  messageField,
} from '../kept-test-kit'
import { openTab } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const branch = 'calummoore/checkout-autocomplete'
const question = 'Continue with work that is not pushed?'
const priya = fakeUsers[1]

async function mergedTab(server: FakeApiServer, delay = new ManualDelay()) {
  serveWork(server, 'none')
  const tab = await openTab(server, routes.workspace(org, id), {
    delay: delay.delay,
  })
  const column = byLabel('Files and tools', tab.view)
  const press = async (name: string, root: HTMLElement = column) => {
    click(byRole('button', name, root))
    await settle()
  }
  const runTimers = async () => {
    await act(() => delay.run(pendingJobWait))
    await settle()
  }
  return { ...tab, column, press, runTimers }
}

describe('Continue in the pull request bar', () => {
  test('a member who may not archive continues: the question lists the work, Cancel sends nothing, and Continue anyway moves the workspace to its new branch with a note and the draft', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'merged', role: 'member' })
    server.signIn(priya)
    serveContinue(server, 'question')
    const tab = await mergedTab(server)
    typeText(messageField(tab.view), 'Keep this draft')
    await settle()
    const archive = queryByRole('button', 'Archive', tab.column)

    await tab.press('Continue')
    const continuing = queryByRole('button', 'Continuing', tab.column) !== null
    await tab.runTimers()
    const items = Array.from(
      byLabel('Work that is not pushed', byLabel(question, tab.view)).children,
      (item) => item.textContent,
    )
    await tab.press('Cancel', byLabel(question, tab.view))
    const cancelled = queryByLabel(question, tab.view)
    await tab.press('Continue')
    await tab.runTimers()
    const { detail, sessions } = workspaceFixtures()
    const events = continuedEvents(
      detail.workspace,
      [...sessions.sessions, ...sessions.history],
      senderSnapshot(priya),
    )
    const moved = { ...detail.workspace, branch: CONTINUED_BRANCH }
    continuedReply(server, moved, lastEvent(server) + events.length)
    await tab.press('Continue anyway', byLabel(question, tab.view))
    for (const event of events.slice(0, -1)) emit(server, event)
    await tab.runTimers()
    const loading = (tab.column.textContent ?? '').includes(
      'Loading from GitHub',
    )
    emit(server, events[events.length - 1])
    await settle()

    const text = (root: HTMLElement) => root.textContent ?? ''
    expect({
      archive,
      continuing,
      items,
      cancelled,
      starts: await bodiesOf(
        server,
        'POST',
        workspacePaths.continue(org, id),
        0,
      ),
      loading,
      bar: [
        text(tab.column).includes(CONTINUED_BRANCH),
        text(tab.column).includes('No commits yet'),
      ],
      note: text(tab.view).includes(
        `You continued on ${CONTINUED_BRANCH}, a new branch from main`,
      ),
      draft: draftOf(tab.view),
    }).toEqual({
      archive: null,
      continuing: true,
      items: [
        'src/app/checkout/AddressForm.tsxnot committed',
        '2 commitsnot pushed',
      ],
      cancelled: null,
      starts: [
        { expectedBranch: branch },
        { expectedBranch: branch },
        { expectedBranch: branch, allowLocalWork: true },
      ],
      loading: true,
      bar: [true, true],
      note: true,
      draft: 'Keep this draft',
    })
  })

  test('a Continue of another member closes an open question, sends nothing for the old branch, and keeps the draft', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'merged' })
    serveContinue(server, 'question')
    const tab = await mergedTab(server)
    typeText(messageField(tab.view), 'Keep this draft')
    await settle()
    await tab.press('Continue')
    await tab.runTimers()
    const asked = queryByLabel(question, tab.view) !== null

    const { detail, sessions } = workspaceFixtures()
    const events = continuedEvents(
      detail.workspace,
      sessions.sessions,
      senderSnapshot(priya),
    )
    for (const event of events.slice(0, -1)) emit(server, event)
    await settle()

    expect({
      asked,
      question: queryByLabel(question, tab.view),
      starts: (
        await bodiesOf(server, 'POST', workspacePaths.continue(org, id), 0)
      ).length,
      loading: (tab.column.textContent ?? '').includes('Loading from GitHub'),
      draft: draftOf(tab.view),
    }).toEqual({
      asked: true,
      question: null,
      starts: 1,
      loading: true,
      draft: 'Keep this draft',
    })
  })

  test('Continue waits while a turn runs, and a stop names its cause and keeps Continue', async () => {
    holdAnimationFrames()
    const running = await mergedTab(
      new FakeApiServer({ banner: 'merged', conversation: 'running' }),
    )
    const waits = {
      line: running.column.querySelector('[role="status"]')?.textContent,
      off: isOff(byRole('button', 'Continue', running.column)),
    }
    const server = new FakeApiServer({ banner: 'merged' })
    serveContinue(server, 'clash')
    const stopped = await mergedTab(server)
    await stopped.press('Continue')
    await stopped.runTimers()

    expect({
      waits,
      stop: stopped.column.querySelector('[role="alert"]')?.textContent,
      again: isOff(byRole('button', 'Continue', stopped.column)),
    }).toEqual({
      waits: { line: 'Continue waits for the agent to finish.', off: true },
      stop: `Continue stopped: the changed files clash with the latest main. The workspace stays on ${branch}.`,
      again: false,
    })
  })
})
