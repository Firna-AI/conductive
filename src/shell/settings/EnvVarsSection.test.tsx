// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { ComputerModel } from '../../app/computer-model'
import { ManualDelay, requestLines } from '../../app/test-kit'
import { orgSettingsPaths } from '../../shared/org-settings'
import {
  accessibleName,
  byRole,
  queryAllByText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { orgSuspendedBody } from '../../test-support/suspended-org'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { ComputerSettings } from './ComputerTab'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const settingsPath = orgSettingsPaths.settings(FAKE_IDS.org)
const names = coreFixtures().settings.settings.envVars.map((item) => item.name)
const [firstName = '', secondName = ''] = names
const suspendedMessage =
  'This org is suspended. For questions, write to abuse@conductive.build.'

/** The Cloud computer settings of Acme, mounted for its admin. */
async function mountedSettings(server: FakeApiServer): Promise<HTMLElement> {
  const app = await startedApp(server)
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!org) throw new Error('The fake org is missing.')
  await app.org(org.id).reload('builds')
  const computer = new ComputerModel(app.org(org.id), new ManualDelay().delay)
  await computer.load()
  const view = mountScreen(
    app,
    <ComputerSettings computer={computer} org={org} />,
  )
  await settle()
  return view
}

/** The names of the text fields, in their order on the page. */
function fields(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('input, textarea'), accessibleName)
}

/** Types into the text field with this name. */
function typeInto(view: HTMLElement, name: string, text: string): void {
  const field = byRole('textbox', name, view)
  if (
    !(field instanceof HTMLInputElement) &&
    !(field instanceof HTMLTextAreaElement)
  ) {
    throw new Error(`${name} is not a text field.`)
  }
  typeText(field, text)
}

/** The names in the list of the variables. */
function listed(view: HTMLElement): (string | null)[] {
  const rows = view.querySelectorAll(
    'ul[aria-label="Environment variables"] > li',
  )
  return Array.from(rows, (row) => row.firstElementChild?.textContent ?? null)
}

/** The bodies of the saves of the settings, in their order. */
function settingsWrites(server: FakeApiServer): Promise<unknown[]> {
  const writes = server.requests.filter(
    (request) =>
      request.method === 'PATCH' &&
      new URL(request.url).pathname === settingsPath,
  )
  return Promise.all(writes.map((request) => request.clone().json()))
}

describe('the environment variables of the cloud computer', () => {
  test('an admin of an org in use adds a variable, changes a value, and deletes a variable, and each form closes after its save', async () => {
    const server = new FakeApiServer()
    const view = await mountedSettings(server)
    click(byRole('button', 'Add variable', view))
    typeInto(view, 'Name', 'API_TOKEN')
    typeInto(view, 'Value', 'token-value')
    click(byRole('button', 'Save variable', view))
    await settle()
    click(byRole('button', `Change the value of ${firstName}`, view))
    typeInto(view, `New value of ${firstName}`, 'new-value')
    click(byRole('button', 'Save', view))
    await settle()
    click(byRole('button', `Delete ${secondName}`, view))
    await settle()
    expect({
      fields: fields(view),
      add: queryByRole('button', 'Add variable', view) !== null,
      rows: listed(view),
      writes: await settingsWrites(server),
    }).toEqual({
      fields: ['Install software', 'Startup script'],
      add: true,
      rows: names,
      writes: [
        {
          envVars: [
            { operation: 'set', name: 'API_TOKEN', value: 'token-value' },
          ],
        },
        {
          envVars: [{ operation: 'set', name: firstName, value: 'new-value' }],
        },
        { envVars: [{ operation: 'remove', name: secondName }] },
      ],
    })
  })

  test('a save that the API refuses as suspended closes the open forms, tells that the variable was not saved, and keeps the names without controls', async () => {
    const server = new FakeApiServer()
    // The org list is old: it shows Acme in use, and the API refuses the save.
    server.json('PATCH', settingsPath, orgSuspendedBody, 403)
    const view = await mountedSettings(server)
    click(byRole('button', `Change the value of ${firstName}`, view))
    click(byRole('button', 'Add variable', view))
    typeInto(view, 'Name', 'API_TOKEN')
    typeInto(view, 'Value', 'token-value')
    const open = fields(view)
    click(byRole('button', 'Save variable', view))
    await settle()
    expect({
      open,
      fields: fields(view),
      buttons: view.querySelectorAll('button').length,
      rows: listed(view),
      writes: requestLines(server).filter((line) => !line.startsWith('GET ')),
      failure: queryByText('API_TOKEN was not saved') !== null,
      reasons: queryAllByText(suspendedMessage).length,
    }).toEqual({
      open: [
        'Install software',
        'Startup script',
        `New value of ${firstName}`,
        'Name',
        'Value',
      ],
      fields: [],
      buttons: 0,
      rows: names,
      writes: [`PATCH ${settingsPath}`],
      failure: true,
      reasons: 1,
    })
  })
})
