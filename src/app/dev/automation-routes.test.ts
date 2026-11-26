import { expect, it } from 'vitest'

import { automationPath, automationsPath } from '../../shared/automations'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import { record } from '../api/parse'
import { readAutomationResponse } from '../api/read-automations'
import { automationRoutes } from './automation-routes'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { orgSecretsOf } from './secret-store'
import { seedState } from './seed'

function readReply(value: unknown) {
  return {
    ...readAutomationResponse(value),
    chosenSecrets: record(value).chosenSecrets,
  }
}

it('saves chosen secrets in the dev fake and keeps them when an older update omits capabilities', async () => {
  const backend = createBackend(
    seedState(readDevOptions('')),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'new-id',
  )
  const store = orgSecretsOf(backend.state, FAKE_IDS.org)
  store.secrets.reverse()
  const foreign = backend.state.orgs.find((org) => org.org.id !== FAKE_IDS.org)
  if (!foreign) throw new Error('The test needs a second org.')
  orgSecretsOf(backend.state, foreign.org.id).secrets.push({
    secret: {
      ...store.secrets[0].secret,
      id: 'foreign-secret',
      name: 'FOREIGN_SECRET',
    },
    value: 'foreign-development-value',
  })
  const api = createApiClient(
    routeFetch(
      automationRoutes(backend),
      (path, method) => guardScope(backend.state, path, method),
      new FakeApiServer().fetch,
    ),
  )
  const created = await api.send(
    'POST',
    automationsPath(FAKE_IDS.org),
    {
      name: 'Use a secret',
      repositoryId: 'billing-service',
      sectionId: 'infra',
      prompt: 'Read the design.',
      choice: {
        agent: 'codex',
        model: 'GPT-6.1 Sol',
        effort: 'high',
        fast: false,
      },
      timeZone: 'Europe/London',
      triggers: [],
      capabilities: {
        preapprovedSecretIds: [
          'vercel-token',
          'figma-token',
          'unknown',
          'foreign-secret',
          'figma-token',
        ],
      },
    },
    readReply,
  )
  expect(created.automation.capabilities).toEqual({
    preapprovedSecretIds: ['figma-token', 'vercel-token'],
  })
  expect(created.chosenSecrets).toEqual([
    { id: 'figma-token', name: 'FIGMA_TOKEN' },
    { id: 'vercel-token', name: 'VERCEL_TOKEN' },
  ])
  expect(JSON.stringify(created)).not.toContain('development-value')
  const path = automationPath(FAKE_IDS.org, created.automation.id)
  const updated = await api.send(
    'PATCH',
    path,
    { name: 'Keep the choice' },
    readReply,
  )
  expect(updated.chosenSecrets).toEqual([
    { id: 'figma-token', name: 'FIGMA_TOKEN' },
    { id: 'vercel-token', name: 'VERCEL_TOKEN' },
  ])
  store.secrets = store.secrets.filter(
    ({ secret }) => secret.id !== 'figma-token',
  )
  const read = await api.get(path, readReply)
  expect(updated.automation.capabilities).toEqual({
    preapprovedSecretIds: ['figma-token', 'vercel-token'],
  })
  expect(read.automation.capabilities).toEqual({
    preapprovedSecretIds: ['vercel-token'],
  })
  expect(read.chosenSecrets).toEqual([
    { id: 'vercel-token', name: 'VERCEL_TOKEN' },
  ])
  expect(JSON.stringify(read)).not.toContain('development-value')
  const cleared = await api.send(
    'PATCH',
    path,
    { capabilities: { preapprovedSecretIds: [] } },
    readReply,
  )
  expect(cleared.automation.capabilities).toEqual({ preapprovedSecretIds: [] })
  expect(cleared.chosenSecrets).toEqual([])
})
