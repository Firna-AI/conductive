// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { acme, defaultsIn } from '../../app/default-logins.test-support'
import type { AccountResponse } from '../../shared/account'
import {
  accessibleName,
  byRole,
  queryAllByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
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
  rowElements,
  sentSaves,
  solHigh,
  sonnetMedium,
} from './favourites-test-kit'

const limitLine =
  'The menu shows 5 favourites at most. Remove one to add another.'

/** Whether Add a favourite is off, as a screen reader hears it. */
function addOff(view: HTMLElement): boolean {
  const add = byRole('button', 'Add a favourite', view)
  return add.getAttribute('aria-disabled') === 'true'
}

/**
 * The names of the items of the open menu with `label`, and the marked
 * ones.
 */
function openMenu(label = 'Model and effort') {
  const menu = byRole('menu', label)
  const items = Array.from(menu.querySelectorAll('[role^="menuitem"]'))
  return {
    items: items.map(accessibleName),
    marked: items
      .filter((item) => item.getAttribute('aria-checked') === 'true')
      .map(accessibleName),
  }
}

describe('the Favourites section of Preferences', () => {
  test('lists the five favourites in the order of the menu, each with its picker and ×, shows Add a favourite off with the line of the limit, and the menu of the picker of a row shows no favourite and starts with All models', async () => {
    const server = new FakeApiServer()
    const { view } = await mountFavourites(server)
    const removes = rowElements(view).map((row) =>
      accessibleName(Array.from(row.querySelectorAll('button')).at(-1) ?? row),
    )
    click(pickerAt(view, 1))
    const menu = openMenu()
    click(byRole('menuitem', 'Effort Max'))
    expect({
      rows: favouriteRows(view),
      removes,
      addOff: addOff(view),
      limit: queryAllByText(limitLine, view).length,
      menu,
      efforts: openMenu('Effort'),
    }).toEqual({
      rows: [
        'Opus 5.5, High',
        'Opus 5.5, Max',
        'Sonnet 5.5, Medium',
        'GPT-6.1 Sol, High',
        'GPT-6 Astra, Medium',
      ],
      removes: [
        'Remove Opus 5.5 High',
        'Remove Opus 5.5 Max',
        'Remove Sonnet 5.5 Medium',
        'Remove GPT-6.1 Sol High',
        'Remove GPT-6 Astra Medium',
      ],
      addOff: true,
      limit: 1,
      menu: {
        items: ['All models', 'Effort Max', 'Fast'],
        marked: [],
      },
      efforts: {
        items: ['Low', 'Medium', 'High', 'Extra high', 'Max', 'Ultra'],
        marked: ['Max'],
      },
    })
  })

  test('× removes a favourite and saves the list without it at once, and with four favourites the line of the limit goes and Add a favourite turns on', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    const { view } = await mountFavourites(server)
    click(removeButton(view, 'Sonnet 5.5 Medium'))
    await settle()
    expect({
      rows: favouriteRows(view),
      sent: await sentSaves(server),
      limit: queryAllByText(limitLine, view).length,
      addOff: addOff(view),
    }).toEqual({
      rows: [
        'Opus 5.5, High',
        'Opus 5.5, Max',
        'GPT-6.1 Sol, High',
        'GPT-6 Astra, Medium',
      ],
      sent: [{ favourites: [opusHigh, opusMax, solHigh, astraMedium] }],
      limit: 0,
      addOff: false,
    })
  })

  test('a favourite whose model the own endpoint does not list, or that the model list no longer holds, shows greyed with its line, an org endpoint greys none, and the picker of a hidden row still changes it', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    const fixtures = coreFixtures()
    const gone: AgentChoice = { ...opusHigh, model: 'claude-old-4' }
    const account: AccountResponse = {
      ...fixtures.account,
      favourites: [opusHigh, sonnetMedium, gone, astraMedium],
      agentLogins: [
        {
          agent: 'claude',
          connected: true,
          kind: 'endpoint',
          host: 'proxy.example.com',
          modelList: { missing: ['Sonnet 5.5'], checkedAt: FAKE_TIME },
          noReuse: false,
          updatedAt: FAKE_TIME,
        },
        ...fixtures.account.agentLogins.filter(
          (login) => login.agent === 'codex',
        ),
      ],
      // The org endpoint of Acme leaves out Opus 5.5 only for the
      // sessions on the org login.
      defaultLogins: defaultsIn(
        acme,
        { claude: 'org', codex: 'own' },
        fakeUser.id,
        { missing: ['Opus 5.5'], checkedAt: FAKE_TIME },
      ),
    }
    const { view } = await mountFavourites(server, account)
    const hidden = favouriteRows(view)
    click(pickerAt(view, 1))
    click(byRole('menuitem', 'All models'))
    click(byRole('menuitemradio', 'Fable 5.1'))
    await settle()
    const fableMedium: AgentChoice = { ...sonnetMedium, model: 'Fable 5.1' }
    expect({
      hidden,
      picked: favouriteRows(view),
      sent: await sentSaves(server),
    }).toEqual({
      hidden: [
        'Opus 5.5, High',
        'Sonnet 5.5, Medium / Hidden from the model menu, because your endpoint does not list Sonnet 5.5.',
        'claude-old-4, High / Hidden from the model menu, because claude-old-4 is no longer available.',
        'GPT-6 Astra, Medium',
      ],
      picked: [
        'Opus 5.5, High',
        'Fable 5.1, Medium',
        'claude-old-4, High / Hidden from the model menu, because claude-old-4 is no longer available.',
        'GPT-6 Astra, Medium',
      ],
      sent: [{ favourites: [opusHigh, fableMedium, gone, astraMedium] }],
    })
  })
})
