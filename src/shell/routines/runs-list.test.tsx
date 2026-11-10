// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { routinePaths, type Routine } from '../../shared/routines'
import { acceptedTermsSignInPath } from '../../shared/terms'
import {
  byRole,
  queryAllByText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { listRuns, runsPage } from '../../test-support/fixtures/routine-runs'
import { routineFixtures } from '../../test-support/fixtures/routines'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { openApp, runRows as rows, wordsOf } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

function fixture(id: string): Routine {
  const routine = routineFixtures().routines.find((item) => item.id === id)
  if (!routine) throw new Error(`The fixtures have no routine ${id}.`)
  return routine
}

/** The address of each named link of the page, or null for a missing link. */
function hrefs(view: HTMLElement, names: readonly string[]) {
  return names.map(
    (name) => queryByRole('link', name, view)?.getAttribute('href') ?? null,
  )
}

/** The app at the review routine, whose runs are a run list of the mockups. */
async function reviewRuns(
  list: 'failed' | 'skipped' | 'suspended',
  role: 'admin' | 'member' = 'admin',
) {
  const server = new FakeApiServer({ role })
  const runs = listRuns(fixture('review-prs'), list)
  server.json('GET', routinePaths.runs(org, 'review-prs'), runsPage(runs))
  return openApp(server, routes.routine(org, 'review-prs'))
}

describe('the Runs list of a routine', () => {
  test('shows each state of a run with its trigger, pull request, and time, and adds the older runs', async () => {
    const { view } = await openApp(
      new FakeApiServer(),
      routes.routine(org, 'review-prs'),
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

  test('a failed run says its cause, and only the owner gets the action that fixes it', async () => {
    const owner = (await reviewRuns('failed')).view
    const ownerRows = await rows(owner)
    const actions = hrefs(owner, ['Connect Claude', 'Sign in with GitHub'])
    const workspaces = hrefs(owner, [
      'Open the workspace of PR opened #488',
      'Open the workspace of PR pushed #486',
    ])
    owner.remove()
    const member = (await reviewRuns('failed', 'member')).view
    expect({
      ownerRows,
      actions,
      workspaces,
      memberRows: (await rows(member)).slice(0, 2),
      memberActions: hrefs(member, ['Connect Claude', 'Sign in with GitHub']),
    }).toEqual({
      ownerRows: [
        "PR opened #488 2m Failed Your Claude login isn't connected. Connect Claude",
        'PR pushed #487 1h Failed Your GitHub access expired. Sign in with GitHub',
        "PR opened #487 3h Failed The cloud computer didn't start.",
        "PR pushed #486 5h Couldn't start",
        'PR opened #486 6h Ready',
      ],
      actions: ['/account?connect=claude', acceptedTermsSignInPath()],
      workspaces: [null, '/orgs/acme/workspaces/review-prs-pushed-486'],
      memberRows: [
        "PR opened #488 2m Failed Cal's Claude login isn't connected.",
        "PR pushed #487 1h Failed Cal's GitHub access expired.",
      ],
      memberActions: [null, null],
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

  test('a routine without runs says that each run opens a workspace', async () => {
    const { view } = await openApp(
      new FakeApiServer(),
      routes.routine(org, 'morning-summary'),
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
      routes.routine(org, 'error-triage', 'runs'),
      'phone',
    )
    const shown = await rows(view)
    const tabs = () => ({
      routine: byRole('link', 'Routine', view).getAttribute('aria-current'),
      runs: byRole('link', 'Runs', view).getAttribute('aria-current'),
    })
    const onRuns = {
      tabs: tabs(),
      first: shown[0],
      save: queryByRole('button', 'Save', view),
    }
    await press(byRole('link', 'Routine', view))
    await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields on the Routine tab',
    )
    expect({
      onRuns,
      onRoutine: {
        tabs: tabs(),
        address: navigation.href(),
        list: queryByRole('list', 'Runs', view),
      },
    }).toEqual({
      onRuns: {
        tabs: { routine: null, runs: 'page' },
        first:
          "Hourly 5m Failed Your Claude login isn't connected. Connect Claude",
        save: null,
      },
      onRoutine: {
        tabs: { routine: 'page', runs: null },
        address: '/orgs/acme/routines/error-triage',
        list: null,
      },
    })
  })
})
