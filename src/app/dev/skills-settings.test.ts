import { expect, it } from 'vitest'

import {
  orgSettingsPaths,
  type UpdateOrgSettingsRequest,
} from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import { readSettings } from '../api/read-settings'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'
import { settingsRoutes } from './settings-routes'

it('keeps repository trust bound to named saves in the development API without starting a build', async () => {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions('')),
    server.events,
    () => FAKE_TIME,
    () => 'unused',
  )
  const api = createApiClient(
    routeFetch(
      settingsRoutes(backend),
      (path, method) => guardScope(backend.state, path, method),
      server.fetch,
    ),
  )
  const org = backend.state.orgs[0]
  const path = orgSettingsPaths.settings(org.org.id)
  const beforeBuilds = org.builds.length
  const save = (body: UpdateOrgSettingsRequest) =>
    api.send('PATCH', path, body, readSettings)
  expect(
    await save({
      skillsRepository: ' https://github.com/Owner/Skills.git ',
      trustedSkillsRepository: 'OWNER/SKILLS',
    }),
  ).toMatchObject({
    skillsRepository: 'Owner/Skills',
    trustedSkillsRepository: 'owner/skills',
  })
  expect(
    await save({
      startupScript: 'echo start',
      envVars: [{ operation: 'set', name: 'SITE', value: 'example' }],
    }),
  ).toMatchObject({
    skillsRepository: 'Owner/Skills',
    trustedSkillsRepository: 'owner/skills',
  })
  expect(await save({ skillsRepository: 'other/skills' })).toMatchObject({
    skillsRepository: 'other/skills',
    trustedSkillsRepository: '',
  })
  expect(await save({ trustedSkillsRepository: 'owner/skills' })).toMatchObject(
    {
      skillsRepository: 'other/skills',
      trustedSkillsRepository: '',
    },
  )
  expect(
    await save({
      skillsRepository: 'invalid text',
      trustedSkillsRepository: 'invalid text',
    }),
  ).toMatchObject({
    skillsRepository: 'invalid text',
    trustedSkillsRepository: '',
  })
  expect(org.builds).toHaveLength(beforeBuilds)
})
