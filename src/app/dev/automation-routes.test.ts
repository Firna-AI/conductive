import { expect, it } from 'vitest'

import { automationPath, automationsPath } from '../../shared/automations'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import { readAutomationResponse } from '../api/read-automations'
import { automationRoutes } from './automation-routes'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'

it('saves chosen secrets in the dev fake and keeps them when an older update omits capabilities', async () => {
  const backend = createBackend(
    seedState(readDevOptions('')),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'new-id',
  )
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
        preapprovedSecretIds: ['figma-token', 'unknown', 'figma-token'],
      },
    },
    readAutomationResponse,
  )
  expect(created.automation.capabilities).toEqual({
    preapprovedSecretIds: ['figma-token'],
  })
  const path = automationPath(FAKE_IDS.org, created.automation.id)
  const updated = await api.send(
    'PATCH',
    path,
    { name: 'Keep the choice' },
    readAutomationResponse,
  )
  const read = await api.get(path, readAutomationResponse)
  expect(updated.automation.capabilities).toEqual({
    preapprovedSecretIds: ['figma-token'],
  })
  expect(read.automation.capabilities).toEqual({
    preapprovedSecretIds: ['figma-token'],
  })
  const cleared = await api.send(
    'PATCH',
    path,
    { capabilities: { preapprovedSecretIds: [] } },
    readAutomationResponse,
  )
  expect(cleared.automation.capabilities).toEqual({ preapprovedSecretIds: [] })
})
