// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { AccountResponse } from '../../shared/account'
import {
  accessibleName,
  byRole,
  queryAllByText,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import { click, settle } from '../test-mount'
import {
  astraMedium,
  echoSaves,
  favouriteRows,
  mountFavourites,
  opusHigh,
  opusMax,
  pickerAt,
  removeButton,
  sentSaves,
  solHigh,
  sonnetMedium,
} from './favourites-test-kit'

const limitLine =
  'The menu shows 5 favourites at most. Remove one to add another.'
const emptyLine = 'Add a favourite to show it first in the model menu.'
const fableTaken = 'Fable 5.1 is already a favourite at every effort.'

/** The account of the fake API with `favourites`. */
function accountWith(
  favourites: readonly AgentChoice[],
  agentLogins = coreFixtures().account.agentLogins,
): AccountResponse {
  return { ...coreFixtures().account, favourites, agentLogins }
}

/** Add a favourite. */
function addButton(view: HTMLElement): HTMLElement {
  return byRole('button', 'Add a favourite', view)
}

/** Whether Add a favourite is off, as a screen reader hears it. */
function addOff(view: HTMLElement): boolean {
  return addButton(view).getAttribute('aria-disabled') === 'true'
}

/**
 * The rows of the open list of Add a favourite: each row as its role and
 * its name, and a line between two groups as "—".
 */
function addList(): string[] {
  const list = byRole('menu', 'Add a favourite')
  return Array.from(list.children, (row) =>
    row.tagName === 'HR'
      ? '—'
      : `${row.getAttribute('role')} ${accessibleName(row)}`,
  )
}

describe('Add a favourite in the Favourites section', () => {
  test('opens the list of every model that the pickers offer, in the groups of All models, with no mark, efforts, or Fast, and a pick adds the model at the end at the nearest free effort below the effort of the default of new workspaces, saves at once, moves the focus to the picker of the new row, and at five turns Add a favourite off', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    // The own endpoint of Claude does not list Fable 5.1.
    const logins: AccountResponse['agentLogins'] = [
      {
        agent: 'claude',
        connected: true,
        kind: 'endpoint',
        host: 'proxy.example.com',
        modelList: { missing: ['Fable 5.1'], checkedAt: FAKE_TIME },
        noReuse: false,
        updatedAt: FAKE_TIME,
      },
      ...coreFixtures().account.agentLogins.filter(
        (login) => login.agent === 'codex',
      ),
    ]
    const four = [opusHigh, opusMax, sonnetMedium, solHigh]
    const { view } = await mountFavourites(server, accountWith(four, logins))
    const before = addOff(view)
    click(addButton(view))
    // The list holds the rows that the pick below presses.
    expect({ before, list: addList() }).toEqual({
      before: false,
      list: [
        'menuitem Opus 5.5',
        'menuitem Sonnet 5.5',
        '—',
        'menuitem GPT-6.1 Sol',
        'menuitem GPT-6 Astra',
      ],
    })
    click(byRole('menuitem', 'Opus 5.5'))
    await settle()
    const opusMedium: AgentChoice = { ...opusHigh, effort: 'medium' }
    expect({
      rows: favouriteRows(view),
      sent: await sentSaves(server),
      focused: document.activeElement === pickerAt(view, 4),
      open: queryByRole('menu', 'Add a favourite'),
      after: addOff(view),
      limit: queryAllByText(limitLine, view).length,
    }).toEqual({
      rows: [
        'Opus 5.5, High',
        'Opus 5.5, Max',
        'Sonnet 5.5, Medium',
        'GPT-6.1 Sol, High',
        'Opus 5.5, Medium',
      ],
      sent: [{ favourites: [...four, opusMedium] }],
      focused: true,
      open: null,
      after: true,
      limit: 1,
    })
  })

  test('a pick of a model whose every effort is already a favourite adds and saves nothing, and a muted line that a screen reader reads out says so under the list until the next change', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    const fable = (effort: AgentChoice['effort']): AgentChoice => ({
      ...opusHigh,
      model: 'Fable 5.1',
      effort,
    })
    const { view } = await mountFavourites(
      server,
      accountWith([opusHigh, fable('low'), fable('medium'), fable('high')]),
    )
    click(addButton(view))
    click(byRole('menuitem', 'Fable 5.1'))
    await settle()
    const picked = {
      rows: favouriteRows(view).length,
      saves: (await sentSaves(server)).length,
      line: queryByRole('status', fableTaken, view)?.textContent,
      alert: queryByRole('alert', fableTaken, view),
    }
    click(removeButton(view, 'Fable 5.1 Low'))
    await settle()
    expect({
      picked,
      line: queryAllByText(fableTaken, view).length,
      saves: (await sentSaves(server)).length,
    }).toEqual({
      picked: { rows: 4, saves: 0, line: fableTaken, alert: null },
      line: 0,
      saves: 1,
    })
  })

  test('with no favourite, the section shows a muted line in place of the list, and on a phone Add a favourite opens its list in a sheet, whose pick adds the model at the effort of the default of new workspaces and moves the focus to its picker', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    const account: AccountResponse = {
      ...accountWith([]),
      defaultChoice: { ...opusHigh, effort: 'medium' },
    }
    const { view } = await mountFavourites(server, account, 'phone')
    const empty = {
      list: queryByLabel('Favourites', view),
      line: queryAllByText(emptyLine, view).length,
      addOff: addOff(view),
    }
    click(addButton(view))
    const sheet = queryByRole('dialog', 'Add a favourite') !== null
    click(byRole('menuitem', 'GPT-6 Astra'))
    await settle()
    expect({
      empty,
      sheet,
      rows: favouriteRows(view),
      line: queryAllByText(emptyLine, view).length,
      sent: await sentSaves(server),
      focused: document.activeElement === pickerAt(view, 0),
    }).toEqual({
      empty: { list: null, line: 1, addOff: false },
      sheet: true,
      rows: ['GPT-6 Astra, Medium'],
      line: 0,
      sent: [{ favourites: [astraMedium] }],
      focused: true,
    })
  })
})
