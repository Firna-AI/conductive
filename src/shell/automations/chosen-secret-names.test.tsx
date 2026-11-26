// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  automationPath,
  type AutomationResponse,
} from '../../shared/automations'
import { secretsPath } from '../../shared/secrets'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer, type FakeApiOptions } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { automationFixtures } from '../../test-support/fixtures/automations'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { openApp, promptLines } from './automation-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const { secrets } = secretFixtures()
const id = 'review-prs'
const path = automationPath(org, id)

const logins = 'Runs use your Claude login and GitHub access.'
const saved = 'Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question.'
const hint =
  'Text in a pull request, such as a comment, can steer the agent to use these secrets.'
const unavailable = {
  error: { code: 'secrets_unavailable', message: 'The secrets did not load.' },
}

/**
 * The answer of the current Worker for `review-prs`, which saves FIGMA_TOKEN
 * and VERCEL_TOKEN and has pull request triggers. `chosenSecrets` names the
 * chosen secrets.
 */
function answer(
  chosenSecrets: NonNullable<AutomationResponse['chosenSecrets']>,
): AutomationResponse {
  const automation = automationFixtures().automations.find(
    (item) => item.id === id,
  )
  if (!automation) throw new Error(`The fixtures have no automation ${id}.`)
  return { automation, runLogin: null, chosenSecrets }
}

/** The fake API, which answers `review-prs` with `reply`, and the secrets list with `list`. */
function serverWith(
  reply: AutomationResponse,
  list: { body: unknown; status: number },
  options?: FakeApiOptions,
): FakeApiServer {
  const server = new FakeApiServer(options)
  server.json('GET', path, reply)
  server.json('GET', secretsPath(org), list.body, list.status)
  return server
}

/** The reads of the secrets list of Acme that reached the server. */
function listReads(server: FakeApiServer): number {
  const list = new URL(secretsPath(org), FAKE_ORIGIN).pathname
  return server.requests.filter(
    (request) =>
      request.method === 'GET' && new URL(request.url).pathname === list,
  ).length
}

/** The open Capabilities control of the prompt. */
async function openControl(view: HTMLElement): Promise<HTMLElement> {
  await press(byRole('button', 'Capabilities', view))
  return waitFor(
    () => queryByRole('dialog', 'Capabilities'),
    'the open control',
  )
}

const named = [
  { id: 'figma-token', name: 'FIGMA_TOKEN' },
  { id: 'vercel-token', name: 'VERCEL_TOKEN' },
]
const failed = { body: unavailable, status: 503 }

describe('the names of the chosen secrets of an automation', () => {
  test('another member reads the saved chosen secrets and the hint from the answer, with no read of the secrets list, which fails', async () => {
    const server = serverWith(answer(named), failed, { role: 'member' })
    const { view } = await openApp(server, routes.automation(org, id))
    await waitFor(() => queryByRole('region', 'Prompt', view), 'the prompt')
    expect({ lines: promptLines(view), reads: listReads(server) }).toEqual({
      lines: ["Runs use Cal's Claude login and GitHub access.", saved, hint],
      reads: 0,
    })
  })

  test('the owner keeps the saved chosen secrets and the hint of the answer while the first read of the secrets list fails, and a secret checked after Try again joins them in the order of the list', async () => {
    const server = serverWith(answer(named), failed)
    const { view } = await openApp(server, routes.automation(org, id))
    await waitFor(() => queryByRole('textbox', 'Prompt', view), 'the form')
    const before = { lines: promptLines(view), reads: listReads(server) }
    const control = await openControl(view)
    const retry = await waitFor(
      () => queryByRole('button', 'Try again', control),
      'the failed read of the secrets',
    )
    const whileFailed = promptLines(view)
    server.json('GET', secretsPath(org), { secrets })
    await press(retry)
    await press(
      await waitFor(
        () => queryByLabel('PROD_DATABASE_URL', control),
        'the listed secrets',
      ),
    )
    expect({ before, whileFailed, checked: promptLines(view) }).toEqual({
      before: { lines: [logins, saved, hint], reads: 0 },
      whileFailed: [logins, saved, hint],
      checked: [
        logins,
        'Runs can use FIGMA_TOKEN, PROD_DATABASE_URL, and VERCEL_TOKEN with no question.',
        hint,
      ],
    })
  })

  test('an answer that names no chosen secret shows no line and no hint, with no read of the list, also after the control lists the saved secrets as checked', async () => {
    const server = serverWith(answer([]), { body: { secrets }, status: 200 })
    const { view } = await openApp(server, routes.automation(org, id))
    await waitFor(() => queryByRole('textbox', 'Prompt', view), 'the form')
    const before = { lines: promptLines(view), reads: listReads(server) }
    const control = await openControl(view)
    await waitFor(() => queryByLabel('FIGMA_TOKEN', control), 'the secrets')
    const figma = byLabel('FIGMA_TOKEN', control)
    expect({
      before,
      checked: figma instanceof HTMLInputElement && figma.checked,
      listed: promptLines(view),
    }).toEqual({
      before: { lines: [logins], reads: 0 },
      checked: true,
      listed: [logins],
    })
  })
})
