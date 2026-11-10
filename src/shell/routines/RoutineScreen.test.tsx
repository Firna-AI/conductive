// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  routinePath,
  routinesPath,
  type Routine,
  type RoutinesResponse,
} from '../../shared/routines'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { routineFixtures } from '../../test-support/fixtures/routines'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { bodiesOf, isOff, openApp, wordsOf } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

function fixture(id: string): Routine {
  const routine = routineFixtures().routines.find((item) => item.id === id)
  if (!routine) throw new Error(`The fixtures have no routine ${id}.`)
  return routine
}

/** The buttons of the page that change the routine, in this order. */
function actions(view: HTMLElement): string[] {
  return ['Add trigger', 'Turn off', 'Delete', 'Save'].filter(
    (name) => queryByRole('button', name, view) !== null,
  )
}

/** The words of the main area of the page. */
function page(view: HTMLElement): string {
  const main = view.querySelector('main')
  if (!main) throw new Error('The frame has no main area.')
  return wordsOf(main)
}

describe('the routine page', () => {
  test('the owner gets the fields and Delete, and Save stays off until a change', async () => {
    const { view } = await openApp(
      new FakeApiServer(),
      routes.routine(org, 'review-prs'),
    )
    const name = await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields of the owner',
    )
    const unchanged = isOff(byRole('button', 'Save', view))
    await typeText(name, 'Review every pull request')
    expect({
      title: view.querySelector('main h1')?.textContent,
      active: byRole('switch', 'Active', view).getAttribute('aria-checked'),
      repository: queryByRole('button', 'Repository: acme/storefront', view),
      section: queryByRole(
        'button',
        'Section of the run workspaces: General',
        view,
      ),
      triggers: wordsOf(byRole('list', 'Triggers', view)),
      prompt: (byRole('textbox', 'Prompt', view) as HTMLTextAreaElement).value,
      logins: page(view).includes(
        'Runs use your Claude login and GitHub access.',
      ),
      actions: actions(view),
      unchanged,
      changed: isOff(byRole('button', 'Save', view)),
    }).toEqual({
      title: 'Review pull requests',
      active: 'true',
      repository: expect.anything(),
      section: expect.anything(),
      triggers: 'PR opened Authors PR pushed Authors',
      prompt:
        'Review this pull request for bugs, missing tests, and unclear names. Post your findings as one review on the pull request, and push no commits.',
      logins: true,
      actions: ['Add trigger', 'Delete', 'Save'],
      unchanged: true,
      changed: false,
    })
  })

  test('a member reads the routine without fields and without actions', async () => {
    const { view } = await openApp(
      new FakeApiServer({ role: 'member' }),
      routes.routine(org, 'review-prs'),
    )
    await waitFor(
      () => queryByText('Only Cal can change this routine.', view),
      'the routine as a member reads it',
    )
    expect({
      name: queryByRole('textbox', 'Name', view),
      words: page(view),
      actions: actions(view),
    }).toEqual({
      name: null,
      words:
        "Routines Review pull requests Routine Only Cal can change this routine. State Active Repository acme/storefront Section General By Cal Triggers PR opened PR pushed Prompt Review this pull request for bugs, missing tests, and unclear names. Post your findings as one review on the pull request, and push no commits. Opus 5.5 High Runs use Cal's Claude login and GitHub access.",
      actions: [],
    })
  })

  test("an admin reads another member's routine, and turns it off", async () => {
    const server = new FakeApiServer()
    const id = 'dependency-updates'
    const { view } = await openApp(server, routes.routine(org, id))
    const note = 'Only Priya Raman can change this routine.'
    await waitFor(
      () => queryByText(`${note} You can turn it off or delete it.`, view),
      'the routine as an admin reads it',
    )
    const before = actions(view)
    server.json('PATCH', routinePath(org, id), {
      routine: { ...fixture(id), active: false, nextRunAt: null },
    })
    await press(byRole('button', 'Turn off', view))
    await waitFor(
      () => queryByText(`${note} You can delete it.`, view),
      'the routine after Turn off',
    )
    expect({
      before,
      after: actions(view),
      state: page(view).includes('State Off'),
      sent: await bodiesOf(server, 'PATCH', routinePath(org, id)),
    }).toEqual({
      before: ['Turn off', 'Delete'],
      after: ['Delete'],
      state: true,
      sent: [{ active: false }],
    })
  })

  test('Delete asks first, then deletes the routine and opens the Routines list without it', async () => {
    const server = new FakeApiServer()
    const { navigation, view } = await openApp(
      server,
      routes.routine(org, 'review-prs'),
    )
    await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields of the owner',
    )
    await press(byRole('button', 'Delete', view))
    const question = byRole('dialog', 'Delete Review pull requests?')
    const asked = wordsOf(question)
    const rest = routineFixtures().list.routines.filter(
      (routine) => routine.id !== 'review-prs',
    )
    // The server no longer lists the routine after the delete.
    server.json('GET', routinesPath(org), {
      routines: rest,
    } satisfies RoutinesResponse)
    await press(byRole('button', 'Delete routine', question))
    const list = await waitFor(
      () => queryByRole('list', 'Routines', view),
      'the Routines list',
    )
    expect({
      asked,
      address: navigation.href(),
      deleted: server.requests.filter(
        (request) =>
          request.method === 'DELETE' &&
          new URL(request.url).pathname === routinePath(org, 'review-prs'),
      ).length,
      listed: wordsOf(list).includes('Review pull requests'),
    }).toEqual({
      asked:
        'Delete Review pull requests? Its triggers and prompt are deleted. Its run workspaces stay. Cancel Delete routine',
      address: routes.routines(org),
      deleted: 1,
      listed: false,
    })
  })
})
