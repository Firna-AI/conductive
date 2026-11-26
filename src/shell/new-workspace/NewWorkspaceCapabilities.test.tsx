// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { secretsPath } from '../../shared/secrets'
import { workspacesPath } from '../../shared/workspaces'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import { bodiesOf, org } from '../workspace/kept-test-kit'
import { mainOf, messageIn, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { secrets } = secretFixtures()

/** The checkbox of a secret in the open control, and the parts it shows. */
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
    parts: () =>
      Array.from(control.querySelectorAll('section[aria-label]'), (part) =>
        part.getAttribute('aria-label'),
      ),
  }
}

describe('the Capabilities control of New workspace', () => {
  test('the create sends the secrets that it pre-approves and no Mac access, a secret for all agents stays checked and off, a browser shows no Mac access part and starts no grant, and the next draft starts again from the defaults', async () => {
    const server = serverWith('page')
    server.json('GET', secretsPath(org), { secrets })
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    click(byRole('button', 'Capabilities', main))
    await settle()
    const control = choices(byRole('dialog', 'Capabilities', main))
    const allAgents = control.state('SENTRY_AUTH_TOKEN')
    const before = control.state('VERCEL_TOKEN')
    const parts = control.parts()
    click(control.box('VERCEL_TOKEN'))
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
      parts,
      sent,
      starts,
      after: again.state('VERCEL_TOKEN'),
    }).toEqual({
      allAgents: { checked: true, off: true },
      before: { checked: false, off: false },
      parts: ['Secrets'],
      sent: expect.objectContaining({
        capabilities: { preapprovedSecretIds: ['vercel-token'] },
      }),
      starts: [],
      after: { checked: false, off: false },
    })
  })
})
