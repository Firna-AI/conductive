// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../app/test-kit'
import { orgSettingsPaths } from '../../shared/org-settings'
import {
  accessibleName,
  byRole,
  queryAllByText,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { orgSuspendedBody } from '../../test-support/suspended-org'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { ComputerTab } from './ComputerTab'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const settingsPath = orgSettingsPaths.settings(FAKE_IDS.org)
const envVars = coreFixtures().settings.settings.envVars
const names = envVars.map((item) => item.name)
const [firstName = '', secondName = ''] = names
/** A saved variable that is secret, and one that is not. */
const secretName = envVars.find((item) => item.secret)?.name ?? ''
const plainName = envVars.find((item) => !item.secret)?.name ?? ''
const suspendedMessage =
  'This org is suspended. For questions, write to abuse@conductive.build.'
const failedSave = {
  error: { code: 'internal', message: 'The settings were not saved.' },
}

/**
 * The Cloud computer tab of Acme, mounted for its admin. The tab gives the
 * settings with their actions, or the read-only view when the person may
 * not change them, as after a refusal of a suspended org.
 */
async function mountedSettings(server: FakeApiServer): Promise<HTMLElement> {
  const app = await startedApp(server)
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!org) throw new Error('The fake org is missing.')
  const view = mountScreen(app, <ComputerTab org={org} />)
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

/** The text that a text field holds. */
function valueOf(view: HTMLElement, name: string): string {
  const field = byRole('textbox', name, view)
  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`${name} is not a text field.`)
  }
  return field.value
}

/** Whether the switch with this name is on. */
function isOn(view: HTMLElement, name: string): boolean {
  return byRole('switch', name, view).getAttribute('aria-checked') === 'true'
}

/** The number of switches on the page. */
function switches(view: HTMLElement): number {
  return view.querySelectorAll('[role="switch"]').length
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
  test('an admin of an org in use adds a secret variable, changes a value with its saved mark, switches a mark, and deletes a variable, and each form closes empty after its save', async () => {
    const server = new FakeApiServer()
    const view = await mountedSettings(server)
    click(byRole('button', 'Add variable', view))
    const newMark = isOn(view, 'Secret')
    typeInto(view, 'Name', 'API_TOKEN')
    typeInto(view, 'Value', 'token-value')
    click(byRole('button', 'Save variable', view))
    await settle()
    click(byRole('button', `Change the value of ${plainName}`, view))
    typeInto(view, `New value of ${plainName}`, 'new-value')
    click(byRole('button', 'Save', view))
    await settle()
    click(byRole('switch', `Secret value of ${secretName}`, view))
    await settle()
    click(byRole('button', `Delete ${secondName}`, view))
    await settle()
    expect(fields(view)).toEqual(['Install software', 'Startup script'])
    click(byRole('button', 'Add variable', view))
    expect({
      newMark,
      reopened: {
        name: valueOf(view, 'Name'),
        value: valueOf(view, 'Value'),
        secret: isOn(view, 'Secret'),
      },
      rows: listed(view),
      writes: await settingsWrites(server),
    }).toEqual({
      newMark: true,
      reopened: { name: '', value: '', secret: true },
      rows: names,
      writes: [
        {
          envVars: [
            {
              operation: 'set',
              name: 'API_TOKEN',
              value: 'token-value',
              secret: true,
            },
          ],
        },
        {
          envVars: [
            {
              operation: 'set',
              name: plainName,
              value: 'new-value',
              secret: false,
            },
          ],
        },
        {
          envVars: [{ operation: 'classify', name: secretName, secret: false }],
        },
        { envVars: [{ operation: 'remove', name: secondName }] },
      ],
    })
  })

  test('a mark that the API does not save shows the saved mark again, and a toast names the variable', async () => {
    const server = new FakeApiServer()
    server.json('PATCH', settingsPath, failedSave, 500)
    const view = await mountedSettings(server)
    const name = `Secret value of ${secretName}`
    click(byRole('switch', name, view))
    const during = isOn(view, name)
    await settle()
    expect({
      during,
      after: isOn(view, name),
      failure: queryByText(`The Secret mark of ${secretName} was not saved`),
      reason: queryAllByText(failedSave.error.message).length,
      writes: await settingsWrites(server),
    }).toEqual({
      during: false,
      after: true,
      failure: expect.any(HTMLElement),
      reason: 1,
      writes: [
        {
          envVars: [{ operation: 'classify', name: secretName, secret: false }],
        },
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
    const openSwitches = switches(view)
    click(byRole('button', 'Save variable', view))
    await settle()
    expect({
      open,
      openSwitches,
      fields: fields(view),
      buttons: view.querySelectorAll('button').length,
      switches: switches(view),
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
      openSwitches: names.length + 1,
      fields: [],
      buttons: 0,
      switches: 0,
      rows: names,
      writes: [`PATCH ${settingsPath}`],
      failure: true,
      reasons: 1,
    })
  })
})
