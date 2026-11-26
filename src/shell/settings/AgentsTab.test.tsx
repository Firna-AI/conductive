// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { productName } from '../../shared/brand'
import { requestLines } from '../../app/test-kit'
import { MODELS_PATH } from '../../shared/agents'
import type { AgentModel } from '../../shared/generated/AgentModel'
import {
  orgAgentLoginPath,
  orgSettingsPaths,
  refreshOrgAgentLoginModelsPath,
} from '../../shared/org-settings'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { agentItem, kindChoices } from '../account/sign-in-test-kit'
import { bodiesOf, fieldNamed } from '../workspace/kept-test-kit'
import { click, settle, typeText } from '../test-mount'
import {
  fillEndpoint,
  gatewayLogin,
  keyLogin,
  noLogin,
  openAgentsTab,
  org,
  serveOrgLogins,
  words,
} from './agents-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** A refusal of a save, as the Worker sends it after a failure. */
const failure = {
  error: { code: 'internal_error', message: 'The request failed. Try again.' },
}

describe('the Agents tab of an admin', () => {
  test('Connect of Codex offers only API key and Own endpoint, asks for a key of the account of Acme, and saves the org login with Replace, Remove, and the switch off', async () => {
    const server = new FakeApiServer()
    serveOrgLogins(server, [gatewayLogin('claude'), noLogin('codex')])
    const { view } = await openAgentsTab(server)
    const before = agentItem(view, 'codex')
    click(byRole('button', 'Connect Codex', view))
    const kinds = kindChoices(view)
    const form = agentItem(view, 'codex')
    const path = orgAgentLoginPath(org, 'codex')
    server.json('PUT', path, keyLogin('codex'))
    const from = server.requests.length
    typeText(fieldNamed(view, 'OpenAI API key'), 'sk-acme')
    click(byRole('button', 'Connect', view))
    await settle()
    expect({
      before,
      kinds,
      form,
      sent: await bodiesOf(server, 'PUT', path, from),
      after: agentItem(view, 'codex'),
    }).toEqual({
      before: 'Codex Connect',
      kinds: [
        { kind: 'API key', selected: true },
        { kind: 'Own endpoint', selected: false },
      ],
      form: `Codex API key Own endpoint Paste an API key of Acme's OpenAI account. Make one on OpenAI OpenAI API key ${words.keep} Cancel Connect`,
      sent: [{ agent: 'codex', kind: 'api-key', secret: 'sk-acme' }],
      after: `Codex Connected API key Replace Remove ${words.off}`,
    })
  })

  test('Connect of Codex on Own endpoint sends the typed address, and a save that added /v1 shows the note under the host', async () => {
    const server = new FakeApiServer()
    serveOrgLogins(server, [noLogin('claude'), noLogin('codex')])
    const { view } = await openAgentsTab(server)
    click(byRole('button', 'Connect Codex', view))
    fillEndpoint(view, 'https://llm.acme.example.com')
    const path = orgAgentLoginPath(org, 'codex')
    server.json('PUT', path, {
      ...gatewayLogin('codex'),
      endpointV1Added: true,
      modelListReadFailed: false,
    })
    const from = server.requests.length
    click(byRole('button', 'Connect', view))
    await settle()
    expect({
      sent: await bodiesOf(server, 'PUT', path, from),
      codex: agentItem(view, 'codex'),
    }).toEqual({
      sent: [
        {
          agent: 'codex',
          kind: 'endpoint',
          endpoint: 'https://llm.acme.example.com',
          secret: 'key-of-the-gateway',
        },
      ],
      codex: `Codex Connected Replace Remove Own endpoint at llm.acme.example.com ${words.note} ${words.off}`,
    })
  })

  test('a save that read no model list warns with Refresh, and a Refresh that reads a list reads the logins again and names the models that the pickers on the login hide', async () => {
    const server = new FakeApiServer()
    const models: readonly AgentModel[] = [
      ['claude-opus-5-5', 'Opus 5.5'],
      ['claude-fable-5-1', 'Fable 5.1'],
    ].map(([model, label]) => ({
      agent: 'claude',
      model,
      label,
      efforts: ['high'],
    }))
    server.json('GET', MODELS_PATH, { models })
    serveOrgLogins(server, [noLogin('claude'), noLogin('codex')])
    const { view } = await openAgentsTab(server)
    click(byRole('button', 'Connect Claude', view))
    fillEndpoint(view, 'https://llm.acme.example.com')
    server.json('PUT', orgAgentLoginPath(org, 'claude'), {
      ...gatewayLogin('claude'),
      endpointV1Added: false,
      modelListReadFailed: true,
    })
    click(byRole('button', 'Connect', view))
    await settle()
    const warned = agentItem(view, 'claude')
    const refresh = refreshOrgAgentLoginModelsPath(org, 'claude')
    server.json('POST', refresh, { modelListReadFailed: false })
    serveOrgLogins(server, [
      gatewayLogin('claude', ['claude-fable-5-1']),
      noLogin('codex'),
    ])
    const from = server.requests.length
    click(byRole('button', 'Refresh the model list of Claude', view))
    await settle()
    expect({
      warned,
      requests: requestLines(server).slice(from),
      read: agentItem(view, 'claude'),
    }).toEqual({
      warned: `Claude Connected Replace Remove Own endpoint at llm.acme.example.com ${words.warning} Refresh ${words.off}`,
      requests: [`POST ${refresh}`, `GET ${orgSettingsPaths.agentLogins(org)}`],
      read: `Claude Connected Replace Remove Own endpoint at llm.acme.example.com Fable 5.1 is hidden from the model pickers on this login, because this endpoint does not list it. Its model ID is claude-fable-5-1 . Checked 1 minute ago. Refresh ${words.off}`,
    })
  })

  test('Replace opens the form under the login on its kind, keeps Remove and the switch, names a failed save, and saves the new login', async () => {
    const server = new FakeApiServer()
    serveOrgLogins(server, [
      gatewayLogin('claude', undefined, true),
      noLogin('codex'),
    ])
    const { view } = await openAgentsTab(server)
    click(byRole('button', 'Replace the Claude login', view))
    const kinds = kindChoices(view)
    const form = agentItem(view, 'claude')
    click(
      byRole('radio', 'API key', byRole('radiogroup', 'Connect with', view)),
    )
    typeText(fieldNamed(view, 'Anthropic API key'), 'sk-ant-acme')
    const path = orgAgentLoginPath(org, 'claude')
    server.json('PUT', path, failure, 500)
    click(byRole('button', 'Replace', view))
    await settle()
    const failed = agentItem(view, 'claude')
    server.json('PUT', path, keyLogin('claude', true))
    click(byRole('button', 'Replace', view))
    await settle()
    expect({
      kinds,
      form,
      failed,
      replaced: agentItem(view, 'claude'),
    }).toEqual({
      kinds: [
        { kind: 'API key', selected: false },
        { kind: 'Own endpoint', selected: true },
      ],
      form: `Claude Connected Remove Own endpoint at llm.acme.example.com API key Own endpoint Use a gateway or a proxy that serves the Anthropic Messages API, with the models that ${productName} offers: Opus 5.5, Sonnet 5.5, and Fable 5.1. Endpoint Requests go through ${productName} to https://gateway.example.com/v1/messages. API key ${words.keep} Cancel Replace ${words.on}`,
      failed: `Claude Connected Remove Own endpoint at llm.acme.example.com API key Own endpoint Paste an API key of Acme's Anthropic account. Make one on Anthropic Anthropic API key ${words.keep} The Claude login wasn't replaced The request failed. Try again. Cancel Replace ${words.on}`,
      replaced: `Claude Connected API key Replace Remove ${words.on}`,
    })
  })

  test('Remove deletes the org login at once, and the row offers Connect again', async () => {
    const server = new FakeApiServer()
    serveOrgLogins(server, [gatewayLogin('claude'), keyLogin('codex')])
    const path = orgAgentLoginPath(org, 'codex')
    server.empty('DELETE', path)
    const { view } = await openAgentsTab(server)
    const from = server.requests.length
    click(byRole('button', 'Remove Codex', view))
    await settle()
    expect({
      requests: requestLines(server).slice(from),
      codex: agentItem(view, 'codex'),
    }).toEqual({ requests: [`DELETE ${path}`], codex: 'Codex Connect' })
  })
})
