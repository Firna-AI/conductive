import { expect, it } from 'vitest'

import { automationFixtures } from '../../test-support/fixtures/automations'
import { ParseError } from './parse'
import { readAutomationResponse, readAutomations } from './read-automations'

it('reads chosen secrets with their names, and an older Worker reply as an empty list without names', () => {
  const { created } = automationFixtures()
  const older: Record<string, unknown> = { ...created }
  delete older.capabilities
  const chosen = {
    ...older,
    capabilities: { preapprovedSecretIds: ['chosen-secret'] },
  }
  const named = readAutomationResponse({
    automation: chosen,
    runLogin: null,
    chosenSecrets: [{ id: 'chosen-secret', name: 'CHOSEN_SECRET' }],
  })
  expect(named.automation.capabilities).toEqual({
    preapprovedSecretIds: ['chosen-secret'],
  })
  expect(named.chosenSecrets).toEqual([
    { id: 'chosen-secret', name: 'CHOSEN_SECRET' },
  ])
  const previous = readAutomationResponse({ automation: older })
  expect(previous.automation.capabilities).toEqual({
    preapprovedSecretIds: [],
  })
  expect(previous.chosenSecrets).toBeUndefined()
  expect(readAutomations({ automations: [older] })[0].capabilities).toEqual({
    preapprovedSecretIds: [],
  })
  expect(() =>
    readAutomationResponse({ automation: chosen, chosenSecrets: null }),
  ).toThrow(ParseError)
})
