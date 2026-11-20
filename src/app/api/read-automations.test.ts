import { expect, it } from 'vitest'

import { automationFixtures } from '../../test-support/fixtures/automations'
import { readAutomationResponse, readAutomations } from './read-automations'

it('reads chosen secrets and defaults an older Worker reply to an empty list', () => {
  const { created } = automationFixtures()
  const older: Record<string, unknown> = { ...created }
  delete older.capabilities
  const chosen = {
    ...older,
    capabilities: { preapprovedSecretIds: ['chosen-secret'] },
  }
  expect(
    readAutomationResponse({ automation: chosen }).automation.capabilities,
  ).toEqual({
    preapprovedSecretIds: ['chosen-secret'],
  })
  expect(
    readAutomationResponse({ automation: older }).automation.capabilities,
  ).toEqual({
    preapprovedSecretIds: [],
  })
  expect(readAutomations({ automations: [older] })[0].capabilities).toEqual({
    preapprovedSecretIds: [],
  })
})
