// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { automationPath, type Automation } from '../../shared/automations'
import { secretsPath } from '../../shared/secrets'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer, type FakeApiOptions } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { automationFixtures } from '../../test-support/fixtures/automations'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  waitFor,
} from '../../test-support/mount'
import { bodiesOf, isOff, openApp, promptLines } from './automation-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const { secrets } = secretFixtures()
const id = 'review-prs'
const path = automationPath(org, id)

function fixture(automationId: string): Automation {
  const automation = automationFixtures().automations.find(
    (item) => item.id === automationId,
  )
  if (!automation)
    throw new Error(`The fixtures have no automation ${automationId}.`)
  return automation
}

/** The fake API, which also lists the secrets of Acme. */
function serverWithSecrets(options?: FakeApiOptions): FakeApiServer {
  const server = new FakeApiServer(options)
  server.json('GET', secretsPath(org), { secrets })
  return server
}

/** The prompt box with the lines under it. */
function promptOf(view: HTMLElement): HTMLElement {
  return byRole('region', 'Prompt', view)
}

/** Each line under the prompt box, once the line of the secrets shows. */
async function shownLines(view: HTMLElement): Promise<string[]> {
  await waitFor(
    () => promptLines(view).some((line) => line.startsWith('Runs can use')),
    'the line of the chosen secrets',
  )
  return promptLines(view)
}

/** The open control, once it lists the secrets of Acme. */
async function openControl(view: HTMLElement): Promise<HTMLElement> {
  await press(byRole('button', 'Capabilities', view))
  const control = await waitFor(
    () => queryByRole('dialog', 'Capabilities'),
    'the open control',
  )
  await waitFor(() => queryByLabel('FIGMA_TOKEN', control), 'the secrets')
  return control
}

/** Whether the checkbox of a secret is checked, and whether it is off. */
function stateOf(control: HTMLElement, name: string) {
  const box = byLabel(name, control)
  if (!(box instanceof HTMLInputElement)) {
    throw new Error(`${name} is no checkbox.`)
  }
  return { checked: box.checked, off: box.disabled }
}

const logins = 'Runs use your Claude login and GitHub access.'
const hint =
  'Text in a pull request, such as a comment, can steer the agent to use these secrets.'

describe('the chosen secrets of an automation', () => {
  test('the owner opens the Capabilities control before the model picker, with the secrets part only, and a check turns Save on and saves the chosen secrets', async () => {
    const server = serverWithSecrets()
    const held = new HeldRequests(server)
    const { view } = await openApp(
      server,
      routes.automation(org, id),
      'desktop',
      {
        fetch: held.fetch,
      },
    )
    await waitFor(() => queryByRole('textbox', 'Prompt', view), 'the form')
    const bar = Array.from(
      promptOf(view).querySelectorAll('button'),
      accessibleName,
    )
    const control = await openControl(view)
    const opened = {
      intro: control.querySelector('p')?.textContent,
      parts: Array.from(control.querySelectorAll('section'), (part) => [
        part.getAttribute('aria-label'),
        part.querySelector('p')?.textContent,
      ]),
      vercel: stateOf(control, 'VERCEL_TOKEN'),
      replica: stateOf(control, 'PROD_DATABASE_URL'),
      sentry: stateOf(control, 'SENTRY_AUTH_TOKEN'),
      save: isOff(byRole('button', 'Save', view)),
    }
    await press(byLabel('VERCEL_TOKEN', control))
    await press(byLabel('PROD_DATABASE_URL', control))
    const changed = isOff(byRole('button', 'Save', view))
    const chosen = ['figma-token', 'prod-database-url']
    server.json('PATCH', path, {
      automation: {
        ...fixture(id),
        capabilities: { preapprovedSecretIds: chosen },
      },
    })
    held.holdAnswer('PATCH', path)
    await press(byRole('button', 'Save', view))
    const saving = isOff(byRole('button', 'Capabilities', view))
    held.release('PATCH', path)
    await waitFor(() => isOff(byRole('button', 'Save', view)), 'the save')
    expect({
      bar,
      opened,
      changed,
      saving,
      sent: await bodiesOf(server, 'PATCH', path),
    }).toEqual({
      bar: ['Capabilities', 'Model and effort: Opus 5.5, High'],
      opened: {
        intro: 'What agents in each run can use.',
        parts: [
          [
            'Secrets',
            'Each run workspace starts with the checked secrets pre-approved, so agents use them with no question.',
          ],
        ],
        vercel: { checked: true, off: false },
        replica: { checked: false, off: false },
        sentry: { checked: true, off: true },
        save: true,
      },
      changed: false,
      saving: true,
      sent: [{ capabilities: { preapprovedSecretIds: chosen } }],
    })
  })

  test('the lines under the prompt of the owner follow the chosen secrets and the triggers of the form before Save', async () => {
    const { view } = await openApp(
      serverWithSecrets(),
      routes.automation(org, id),
    )
    const saved = await shownLines(view)
    await press(byRole('button', 'Remove PR opened', view))
    await press(byRole('button', 'Remove PR pushed', view))
    const scheduled = promptLines(view)
    const control = await openControl(view)
    await press(byLabel('FIGMA_TOKEN', control))
    await press(byLabel('VERCEL_TOKEN', control))
    const none = promptLines(view)
    await press(byLabel('PROD_DATABASE_URL', control))
    expect({ saved, scheduled, none, one: promptLines(view) }).toEqual({
      saved: [
        logins,
        'Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question.',
        hint,
      ],
      scheduled: [
        logins,
        'Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question.',
      ],
      none: [logins],
      one: [logins, 'Runs can use PROD_DATABASE_URL with no question.'],
    })
  })

  test('another member reads the chosen secrets that the org lists, with the hint of the saved triggers, and gets no Capabilities icon', async () => {
    const member = serverWithSecrets({ role: 'member' })
    // The answer of a previous Worker names no chosen secret, so the page
    // takes the names from the list. A secret that the list does not name
    // has no name to show.
    const capabilities = {
      preapprovedSecretIds: ['figma-token', 'gone-token', 'vercel-token'],
    }
    member.json('GET', path, {
      automation: { ...fixture(id), capabilities },
      runLogin: null,
    })
    const memberPage = (await openApp(member, routes.automation(org, id))).view
    const read = {
      lines: await shownLines(memberPage),
      icon: queryByRole('button', 'Capabilities', memberPage),
    }
    const admin = serverWithSecrets()
    const adminPage = (
      await openApp(admin, routes.automation(org, 'dependency-updates'))
    ).view
    expect({ read, scheduled: await shownLines(adminPage) }).toEqual({
      read: {
        lines: [
          "Runs use Cal's Claude login and GitHub access.",
          'Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question.',
          hint,
        ],
        icon: null,
      },
      scheduled: [
        "Runs use Priya Raman's Codex login and GitHub access.",
        'Runs can use VERCEL_TOKEN with no question.',
      ],
    })
  })

  test('on a phone, the Capabilities icon stays in the bar of the prompt and opens the control as a sheet, which Escape closes', async () => {
    const { view } = await openApp(
      serverWithSecrets(),
      routes.automation(org, id),
      'phone',
    )
    await waitFor(() => queryByRole('textbox', 'Prompt', view), 'the form')
    const bar = Array.from(
      promptOf(view).querySelectorAll('button'),
      accessibleName,
    )
    // The icon takes the focus first, so the focus can come back to it.
    const icon = byRole('button', 'Capabilities', view)
    act(() => icon.focus())
    const sheet = await openControl(view)
    const shown = {
      more: queryByRole('button', 'More options', view),
      modal: sheet.getAttribute('aria-modal'),
      figma: stateOf(sheet, 'FIGMA_TOKEN'),
    }
    await pressKey('Escape')
    await waitFor(
      () => queryByRole('dialog', 'Capabilities') === null,
      'the closed sheet',
    )
    expect({
      bar,
      shown,
      focus: document.activeElement === icon,
    }).toEqual({
      bar: ['Capabilities', 'Model and effort: Opus 5.5, High'],
      shown: {
        more: null,
        modal: 'true',
        figma: { checked: true, off: false },
      },
      focus: true,
    })
  })
})
