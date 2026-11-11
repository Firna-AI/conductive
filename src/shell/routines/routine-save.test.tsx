// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { routinePath, routinesPath, type Routine } from '../../shared/routines'
import {
  byRole,
  queryAllByText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { routineFixtures } from '../../test-support/fixtures/routines'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { bodiesOf, isOff, openApp } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

function fixture(id: string): Routine {
  const routine = routineFixtures().routines.find((item) => item.id === id)
  if (!routine) throw new Error(`The fixtures have no routine ${id}.`)
  return routine
}

/** Picks an option of a select of the page, as a person does. */
async function choose(view: HTMLElement, select: string, option: string) {
  await press(byRole('button', select, view))
  const choice = await waitFor(
    () => queryByRole('option', option, document.body),
    `the option ${option} of ${select}`,
  )
  await press(choice)
}

/** Adds a trigger from the Add trigger menu. */
async function addTrigger(view: HTMLElement, label: string) {
  await press(byRole('button', 'Add trigger', view))
  await press(byRole('menuitem', label))
}

/** Types a login into a list of the open author filter, and adds it. */
async function addLogin(view: HTMLElement, list: string, login: string) {
  await typeText(byRole('textbox', `Add a login to ${list}`, view), login)
  await pressKey('Enter')
}

const frequent =
  'This runs more than once an hour. Set the first field to one minute, such as 0.'

describe('a save of the routine page', () => {
  test('the owner saves a new routine with each kind of trigger, and its page opens', async () => {
    const server = new FakeApiServer()
    const { navigation, view } = await openApp(server, routes.newRoutine(org))
    const prompt = await waitFor(
      () => queryByRole('textbox', 'Prompt', view),
      'the form of a new routine',
    )
    const save = () => byRole('button', 'Save', view)
    await typeText(byRole('textbox', 'Name', view), 'Morning summary')
    await typeText(prompt, '   ')
    const blank = isOff(save())
    await typeText(
      prompt,
      'List the pull requests merged since the last workday.',
    )
    for (const label of [
      'Hourly',
      'Daily',
      'Weekdays',
      'Weekly',
      'Custom (cron)',
      'PR opened',
      'PR pushed',
      'PR merged',
    ]) {
      await addTrigger(view, label)
    }
    await choose(view, 'Hourly minute', '15')
    await choose(view, 'Daily hour', '18')
    await choose(view, 'Daily minute', '30')
    await choose(view, 'Weekly day', 'Friday')
    await typeText(byRole('textbox', 'Cron', view), '30 7 * * 1')
    await press(byRole('button', 'Authors of PR opened', view))
    await addLogin(view, 'Author is', 'dependabot[bot]')
    await press(byRole('button', 'Authors of PR merged', view))
    await addLogin(view, 'Author is not', 'calummoore')
    const ready = !isOff(save())
    await press(save())
    await waitFor(
      () => navigation.href() === routes.routine(org, 'morning-summary'),
      'the page of the new routine',
    )
    expect({
      blank,
      ready,
      sent: await bodiesOf(server, 'POST', routinesPath(org)),
    }).toEqual({
      blank: true,
      ready: true,
      sent: [
        {
          name: 'Morning summary',
          active: true,
          repositoryId: 'storefront',
          sectionId: 'general',
          prompt: 'List the pull requests merged since the last workday.',
          choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
          timeZone: 'UTC',
          triggers: [
            { kind: 'hourly', minute: 15 },
            { kind: 'daily', time: { hour: 18, minute: 30 } },
            { kind: 'weekdays', time: { hour: 9, minute: 0 } },
            { kind: 'weekly', day: 'friday', time: { hour: 9, minute: 0 } },
            { kind: 'custom', cron: '30 7 * * 1' },
            {
              kind: 'pull-request',
              event: 'opened',
              authors: { members: true, is: ['dependabot[bot]'], isNot: [] },
            },
            { kind: 'pull-request', event: 'pushed' },
            {
              kind: 'pull-request',
              event: 'merged',
              authors: { members: false, is: [], isNot: ['calummoore'] },
            },
          ],
        },
      ],
    })
  })

  test('a custom cron that runs more than once an hour is refused, and Save stays off until it names one minute', async () => {
    const server = new FakeApiServer()
    const path = routinePath(org, 'review-prs')
    const { view } = await openApp(server, routes.routine(org, 'review-prs'))
    await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields of the owner',
    )
    await addTrigger(view, 'Custom (cron)')
    await typeText(byRole('textbox', 'Cron', view), '*/15 9-17 * * 1-5')
    const refused = {
      error: queryByText(frequent, view) !== null,
      save: isOff(byRole('button', 'Save', view)),
    }
    await typeText(byRole('textbox', 'Cron', view), '0 9 * * 1-5')
    const passed = {
      error: queryByText(frequent, view) !== null,
      save: isOff(byRole('button', 'Save', view)),
    }
    const saved = fixture('review-prs')
    server.json('PATCH', path, {
      routine: {
        ...saved,
        triggers: [...saved.triggers, { kind: 'custom', cron: '0 9 * * 1-5' }],
      },
    })
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => isOff(byRole('button', 'Save', view)),
      'the saved routine',
    )
    expect({
      refused,
      passed,
      sent: await bodiesOf(server, 'PATCH', path),
    }).toEqual({
      refused: { error: true, save: true },
      passed: { error: false, save: false },
      sent: [
        {
          triggers: [
            { kind: 'pull-request', event: 'opened' },
            { kind: 'pull-request', event: 'pushed' },
            { kind: 'custom', cron: '0 9 * * 1-5' },
          ],
        },
      ],
    })
  })

  test('a save that names an unknown GitHub login shows the refusal, which names the login', async () => {
    const server = new FakeApiServer()
    const path = routinePath(org, 'review-prs')
    const { view } = await openApp(server, routes.routine(org, 'review-prs'))
    await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields of the owner',
    )
    await press(byRole('button', 'Authors of PR opened', view))
    await addLogin(view, 'Author is', 'renovate-bot')
    const refusal =
      'GitHub account renovate-bot was not found. Check the login.'
    server.json(
      'PATCH',
      path,
      { error: { code: 'unknown_github_login', message: refusal } },
      400,
    )
    await press(byRole('button', 'Save', view))
    await waitFor(() => queryByText(refusal, view), 'the refused login')
    expect({
      open: byRole('button', 'Authors of PR opened', view).getAttribute(
        'aria-expanded',
      ),
      shown: queryAllByText(refusal).length,
      chip: queryByRole('button', 'Remove @renovate-bot', view) !== null,
      sent: await bodiesOf(server, 'PATCH', path),
    }).toEqual({
      open: 'true',
      shown: 1,
      chip: true,
      sent: [
        {
          triggers: [
            {
              kind: 'pull-request',
              event: 'opened',
              authors: { members: true, is: ['renovate-bot'], isNot: [] },
            },
            { kind: 'pull-request', event: 'pushed' },
          ],
        },
      ],
    })
  })
})
