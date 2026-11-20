// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { secretsPath } from '../../shared/secrets'
import { workspacesPath } from '../../shared/workspaces'
import { byLabel, byRole, queryByLabel } from '../../test-support/dom-queries'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import { bodiesOf, org } from '../workspace/kept-test-kit'
import { mainOf, messageIn, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { secrets } = secretFixtures()

/** The checkbox of a secret in the open control, and the switch of Mac access. */
function choices(control: HTMLElement) {
  const box = (name: string) => {
    const found = byLabel(name, control)
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`${name} is no checkbox.`)
    }
    return found
  }
  return {
    box,
    state: (name: string) => ({
      checked: box(name).checked,
      off: box(name).disabled,
    }),
    mac: () =>
      byRole('switch', 'Mac access', control).getAttribute('aria-checked'),
  }
}

describe('the Capabilities control of New workspace', () => {
  test('the create sends the secrets that it pre-approves and its Mac access, a secret for all agents stays checked and off, a browser shows the note of the Mac app and starts no grant, and the next draft starts again from the defaults', async () => {
    const server = serverWith('page')
    server.json('GET', secretsPath(org), { secrets })
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    click(byRole('button', 'Capabilities', main))
    await settle()
    const panel = byRole('dialog', 'Capabilities', main)
    const control = choices(panel)
    const allAgents = control.state('SENTRY_AUTH_TOKEN')
    const before = { vercel: control.state('VERCEL_TOKEN'), mac: control.mac() }
    click(control.box('VERCEL_TOKEN'))
    click(byRole('switch', 'Mac access', main))
    const browser = {
      line: queryByLabel('Allow all commands on this Mac', panel),
      note: panel.textContent?.includes(
        'To allow all commands on your Mac, use Allow all commands on this Mac in the Mac app.',
      ),
    }
    typeText(messageIn(main), 'Deploy a preview of the checkout.')
    click(byRole('button', 'Send', main))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
    const starts = await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, 0)
    await tab.go(routes.newWorkspace(org))
    const next = mainOf(tab.view)
    click(byRole('button', 'Capabilities', next))
    await settle()
    const again = choices(byRole('dialog', 'Capabilities', next))
    expect({
      allAgents,
      before,
      browser,
      sent,
      starts,
      after: { vercel: again.state('VERCEL_TOKEN'), mac: again.mac() },
    }).toEqual({
      allAgents: { checked: true, off: true },
      before: { vercel: { checked: false, off: false }, mac: 'false' },
      browser: { line: null, note: true },
      sent: expect.objectContaining({
        capabilities: {
          preapprovedSecretIds: ['vercel-token'],
          macAccess: true,
        },
      }),
      starts: [],
      after: { vercel: { checked: false, off: false }, mac: 'false' },
    })
  })
})
