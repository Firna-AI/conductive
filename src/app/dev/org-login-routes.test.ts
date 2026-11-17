import { expect, it } from 'vitest'

import { orgSettingsPaths } from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { readOrgLogins } from '../api/read-org-logins'
import { createBackend } from './backend'
import { readDevOptions } from './options'
import { orgLoginRoutes } from './org-login-routes'
import { routeFetch } from './router'
import { seedState } from './seed'

it('the read of the org logins names the default logins of the person in that org only, as the Worker does', async () => {
  const backend = createBackend(
    seedState(readDevOptions('?login=none&orgLogin=endpoint')),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'unused',
  )
  const fetch = routeFetch(
    orgLoginRoutes(backend),
    () => {},
    new FakeApiServer().fetch,
  )
  const response = await fetch(orgSettingsPaths.agentLogins('acme'))
  const list = { missing: [], checkedAt: FAKE_TIME - 12 * 60_000 }
  expect(readOrgLogins(await response.json()).defaultLogins).toEqual([
    {
      orgId: 'acme',
      orgName: 'Acme',
      agent: 'claude',
      login: { type: 'org', orgId: 'acme' },
      modelList: list,
      orgModelList: list,
    },
    { orgId: 'acme', orgName: 'Acme', agent: 'codex', login: null },
  ])
})
