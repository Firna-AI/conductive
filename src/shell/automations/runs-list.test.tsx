// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import glyph from '../../../docs/mockups/src/components/workspaces/StatusGlyph.module.css'
import { routes } from '../../app/router'
import { API_PATHS } from '../../shared/api'
import { automationPaths, type Automation } from '../../shared/automations'
import {
  byRole,
  queryAllByRole,
  queryAllByText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { listRuns, runsPage } from '../../test-support/fixtures/automation-runs'
import { automationFixtures } from '../../test-support/fixtures/automations'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { openApp, runRows as rows, wordsOf } from './automation-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

function fixture(id: string): Automation {
  const automation = automationFixtures().automations.find(
    (item) => item.id === id,
  )
  if (!automation) throw new Error(`The fixtures have no automation ${id}.`)
  return automation
}

/** The address of each named link of the page, or null for a missing link. */
function hrefs(view: HTMLElement, names: readonly string[]) {
  return names.map(
    (name) => queryByRole('link', name, view)?.getAttribute('href') ?? null,
  )
}

/** The addresses of all links of the page with each name, top to bottom. */
function allHrefs(view: HTMLElement, names: readonly string[]) {
  return names.map((name) =>
    queryAllByRole('link', name, view).map((link) => link.getAttribute('href')),
  )
}

/** The marks that a failed run can show: the cross, the slash, or ready. */
const markStates = ['error', 'failed', 'ready'] as const

/** The mark of each row of the Runs list, or null for another mark. */
function marks(view: HTMLElement) {
  const list = byRole('list', 'Runs', view)
  return [...list.querySelectorAll(':scope > li')].map((row) => {
    const mark = row.querySelector('span[aria-hidden="true"]')
    return (
      markStates.find((state) => mark?.classList.contains(glyph[state])) ?? null
    )
  })
}

/** The app at the review automation, whose runs are a run list of the mockups. */
async function reviewRuns(
  list: 'failed' | 'skipped' | 'suspended',
  role: 'admin' | 'member' = 'admin',
) {
  const server = new FakeApiServer({ role })
  const runs = listRuns(fixture('review-prs'), list)
  server.json('GET', automationPaths.runs(org, 'review-prs'), runsPage(runs))
  return openApp(server, routes.automation(org, 'review-prs'))
}

describe('the Runs list of an automation', () => {
  test('shows each state of a run with its trigger, pull request, and time, and adds the older runs', async () => {
    const { view } = await openApp(
      new FakeApiServer(),
      routes.automation(org, 'review-prs'),
    )
    const shown = await rows(view)
    const links = hrefs(view, [
      'Open the workspace of PR pushed #485',
      'Open the workspace of PR opened #485',
    ])
    const [pullRequest] = queryAllByText('#485', view).map((text) =>
      text.closest('a')?.getAttribute('href'),
    )
    await press(byRole('button', 'Show older runs', view))
    await waitFor(
      () => queryAllByText('21d', view).length > 0,
      'the older runs after the newest 50',
    )
    const all = await rows(view)
    expect({
      newest: shown.slice(0, 8),
      count: shown.length,
      links,
      pullRequest,
      older: all.slice(-2),
      all: all.length,
      more: queryByRole('button', 'Show older runs', view),
    }).toEqual({
      newest: [
        'PR pushed #485 now Queued',
        'PR opened #485 1m Starting',
        'PR opened #482 4m Working',
        'PR pushed #481 26m Needs input',
        'PR opened #481 1h Done, unread',
        'PR pushed #479 3h Ready',
        'PR opened #478 1d Stopped',
        'PR opened #474 4d Archived',
      ],
      count: 50,
      links: [null, '/orgs/acme/workspaces/review-prs-opened-485'],
      pullRequest: 'https://github.com/acme/storefront/pull/485',
      older: ['PR pushed #450 21d Archived', 'PR opened #450 21d Archived'],
      all: 56,
      more: null,
    })
  })

  test('a failed run says its own cause with its own agent, and only the owner of the run gets the action that fixes it', async () => {
    const actionNames = [
      'Connect Claude',
      'Sign in with GitHub',
      'Connect Codex',
    ]
    const owner = (await reviewRuns('failed')).view
    const ownerRows = await rows(owner)
    const actions = allHrefs(owner, actionNames)
    const workspaces = hrefs(owner, [
      'Open the workspace of PR opened #488',
      'Open the workspace of PR pushed #486',
      'Open the workspace of PR opened #486',
      'Open the workspace of PR pushed #483',
    ])
    const ownerMarks = marks(owner)
    owner.remove()
    const member = (await reviewRuns('failed', 'member')).view
    const memberRows = await rows(member)
    expect({
      ownerRows,
      actions,
      workspaces,
      ownerMarks,
      memberRows: [0, 1, 6, 8, 9].map((index) => memberRows[index]),
      memberActions: allHrefs(member, actionNames),
    }).toEqual({
      ownerRows: [
        "PR opened #488 2m Failed Your Claude login isn't connected. Connect Claude",
        'PR pushed #487 1h Failed Your GitHub access expired. Sign in with GitHub',
        'PR opened #487 2h Ready',
        'PR pushed #486 3h Failed Claude is overloaded right now.',
        "PR opened #486 4h Failed The cloud computer didn't start.",
        "PR opened #485 6h Couldn't start",
        'PR pushed #483 9h Failed The cloud computer stopped before the agent finished. Send a message in the workspace to continue.',
        'PR pushed #480 14h Ready',
        "PR pushed #481 1d Failed Your Claude login isn't connected. Connect Claude",
        "PR pushed #484 2d Failed Your Codex login isn't connected. Connect Codex",
      ],
      // The automation now runs on Claude, and the run of #484 still ran on Codex.
      actions: [
        [routes.account('claude'), routes.account('claude')],
        [API_PATHS.githubSignIn],
        [routes.account('codex')],
      ],
      // A failed first turn and a failed start keep their workspace, and so
      // does a first turn that the cloud computer stopped with no turn to
      // continue it.
      workspaces: [
        null,
        routes.workspace(org, 'review-prs-pushed-486'),
        routes.workspace(org, 'review-prs-opened-486'),
        routes.workspace(org, 'review-prs-pushed-483'),
      ],
      // A failed start shows the cross of its workspace, and each other
      // failure the slash.
      ownerMarks: [
        'failed',
        'failed',
        'ready',
        'failed',
        'error',
        'error',
        'failed',
        'ready',
        'failed',
        'failed',
      ],
      memberRows: [
        "PR opened #488 2m Failed Cal's Claude login isn't connected.",
        "PR pushed #487 1h Failed Cal's GitHub access expired.",
        'PR pushed #483 9h Failed The cloud computer stopped before the agent finished. Send a message in the workspace to continue.',
        "PR pushed #481 1d Failed Cal's Claude login isn't connected.",
        "PR pushed #484 2d Failed Cal's Codex login isn't connected.",
      ],
      memberActions: [[], [], []],
    })
  })

  test('a skipped run says why it started no workspace, and names the account outside the org', async () => {
    const skipped = (await reviewRuns('skipped')).view
    const skippedRows = await rows(skipped)
    skipped.remove()
    const suspended = (await reviewRuns('suspended')).view
    expect({
      skippedRows,
      suspended: (await rows(suspended))[0],
    }).toEqual({
      skippedRows: [
        'PR opened #490 2m Working',
        'PR opened #489 12m Skipped Opened by @rui-silva, not a member of Acme.',
        'PR pushed #483 40m Skipped Pushed by @github-actions[bot], not a member of Acme.',
        'PR opened #483 2h Ready',
      ],
      suspended: 'PR pushed #485 1m Skipped Acme is suspended.',
    })
  })

  test('an automation without runs says that each run opens a workspace', async () => {
    const { view } = await openApp(
      new FakeApiServer(),
      routes.automation(org, 'morning-summary'),
    )
    const column = await waitFor(
      () => queryByRole('complementary', 'Runs', view),
      'the Runs column',
    )
    await waitFor(() => queryByText('No runs yet', column), 'the empty list')
    expect(wordsOf(column)).toBe(
      'Runs No runs yet Each run opens a new workspace and shows here.',
    )
  })

  test('a phone shows the runs on the Runs tab, which has its own address', async () => {
    const { view, navigation } = await openApp(
      new FakeApiServer(),
      routes.automation(org, 'error-triage', 'runs'),
      'phone',
    )
    const shown = await rows(view)
    const tabs = () => ({
      automation: byRole('link', 'Automation', view).getAttribute(
        'aria-current',
      ),
      runs: byRole('link', 'Runs', view).getAttribute('aria-current'),
    })
    const onRuns = {
      tabs: tabs(),
      first: shown[0],
      save: queryByRole('button', 'Save', view),
    }
    await press(byRole('link', 'Automation', view))
    await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields on the Automation tab',
    )
    expect({
      onRuns,
      onAutomation: {
        tabs: tabs(),
        address: navigation.href(),
        list: queryByRole('list', 'Runs', view),
      },
    }).toEqual({
      onRuns: {
        tabs: { automation: null, runs: 'page' },
        first:
          "Hourly 5m Failed Your Claude login isn't connected. Connect Claude",
        save: null,
      },
      onAutomation: {
        tabs: { automation: 'page', runs: null },
        address: '/orgs/acme/automations/error-triage',
        list: null,
      },
    })
  })
})
