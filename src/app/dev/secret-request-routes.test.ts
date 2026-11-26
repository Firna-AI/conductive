import { describe, expect, test } from 'vitest'
import {
  secretAnswerPath,
  secretRequestsPath,
  workspaceSecretValuePath,
} from '../../shared/secret-requests'
import {
  readSecretRequestResponse,
  readSecretRequestsResponse,
} from '../../shared/secret-requests-read'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import {
  createBackend,
  guardScope,
  requireOrg,
  requireWorkspace,
} from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { secretRequestRoutes } from './secret-request-routes'
import { seedSecretRequests } from './secret-request-seed'
import { senderOf } from './secret-store'
import { seedState } from './seed'

const { org, workspace, session } = FAKE_IDS

/**
 * The dev fake with the state of `search`, after its seed: its client, the
 * state of the workspace from before the seed, and the events after it.
 */
function setup(search: string) {
  const options = readDevOptions(search)
  const events = new FakeWorkspaceEvents([])
  const backend = createBackend(
    seedState(options),
    events,
    () => FAKE_TIME + 60_000,
    () => 'new-id',
  )
  const acme = requireOrg(backend.state, org)
  const idle = requireWorkspace(acme, workspace).state
  seedSecretRequests(backend, events, options.secrets)
  const seeded = events.history().throughEventNumber
  const api = createApiClient(
    routeFetch(
      secretRequestRoutes(backend),
      (path, method) => guardScope(backend.state, path, method),
      new FakeApiServer().fetch,
    ),
  )
  return {
    api,
    idle,
    member: senderOf(backend.state.account.user),
    state: () => requireWorkspace(acme, workspace).state,
    sent: () => events.history(seeded).events.map((item) => item.event),
  }
}

describe('the secret requests of the dev fake', () => {
  test('a waiting request gives the workspace the state input, and an Allow in time sends the run and gives the state from before back', async () => {
    const fake = setup('?conversation=running&secrets=waiting')
    const waiting = fake.state()
    const reply = await fake.api.send(
      'POST',
      secretAnswerPath(org, workspace, 'dev-waiting'),
      { kind: 'allow' },
      readSecretRequestResponse,
    )
    expect({
      waiting,
      idle: fake.state() === fake.idle && fake.idle !== 'input',
      answer: [reply.request.state, reply.request.answeredBy],
      events: fake.sent().map((event) => event.type),
    }).toEqual({
      waiting: 'input',
      idle: true,
      answer: ['allowed', fake.member],
      events: ['secrets.request.updated', 'workspace.updated', 'secrets.run'],
    })
  })

  test('a late Allow of a value for this workspace sends the line of the app, keeps the value for the workspace, and Remove ends the value', async () => {
    const fake = setup('?secrets=late-value')
    const turnId = 'turn-answer-dev-late-value'
    const reply = await fake.api.send(
      'POST',
      secretAnswerPath(org, workspace, 'dev-late-value'),
      {
        kind: 'values',
        lifetime: 'workspace',
        values: { MAPBOX_TOKEN: 'pk.dev-value' },
      },
      readSecretRequestResponse,
    )
    const list = () =>
      fake.api.get(
        secretRequestsPath(org, workspace),
        readSecretRequestsResponse,
      )
    const kept = (await list()).workspaceValues
    await fake.api.send(
      'DELETE',
      workspaceSecretValuePath(org, workspace, kept[0]?.id ?? 'none'),
      {},
      () => null,
    )
    const who = fake.member.displayName ?? fake.member.githubLogin
    expect({
      notice: reply.request.notice,
      line: fake.sent().at(-1),
      kept: kept.map((value) => [value.name, value.suppliedBy]),
      removed: (await list()).workspaceValues,
      idle: fake.state() === fake.idle,
    }).toEqual({
      notice: { state: 'sent', turnId },
      line: {
        type: 'secrets.notice',
        sessionId: session,
        turnId,
        requestId: 'dev-late-value',
        text: `${who} gave MAPBOX_TOKEN for this workspace.`,
      },
      kept: [['MAPBOX_TOKEN', fake.member]],
      removed: [],
      idle: true,
    })
  })

  test('an Allow of the newest of three late requests for the same secret allows the two older ones too, as the Worker does, with one line of the app', async () => {
    const fake = setup('?secrets=asked-again')
    const reply = await fake.api.send(
      'POST',
      secretAnswerPath(org, workspace, 'dev-asked-3'),
      { kind: 'allow' },
      readSecretRequestResponse,
    )
    const { requests } = await fake.api.get(
      secretRequestsPath(org, workspace),
      readSecretRequestsResponse,
    )
    expect({
      answer: reply.request.state,
      requests: requests.map((item) => [item.id, item.state, item.answeredBy]),
      lines: fake.sent().filter((event) => event.type === 'secrets.notice'),
      idle: fake.state() === fake.idle,
    }).toEqual({
      answer: 'allowed',
      requests: [
        ['dev-asked-1', 'allowed', fake.member],
        ['dev-asked-2', 'allowed', fake.member],
        ['dev-asked-3', 'allowed', fake.member],
      ],
      lines: [expect.objectContaining({ requestId: 'dev-asked-3' })],
      idle: true,
    })
  })
})
