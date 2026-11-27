import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { parseOrgEnvironment } from './org-environment'
import { workspaceRepositoryLocations } from './repository-location-data'
import { sandboxEnvironment } from './sandbox-environment'
import { readWorkspace } from './workspace-data'

const backendFixture = setupBackendTests()

it.each([
  {
    account: 'boat-other',
    diskValues: [['CONDUCTIVE_DISK_LINE_BYTES', '72000000000']],
  },
  { account: 'e2b-other', diskValues: [] },
])(
  'only sends the disk line of the workspace account $account',
  async ({ account, diskValues }) => {
    const fixture = backendFixture()
    const { runtime, org } = fixture
    const { id } = await seededCompletedWorkspace(fixture)
    runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
      'boat-other': { kind: 'boat', apiKey: 'boat-key', orgId: 'boat-org' },
      'e2b-other': {
        kind: 'e2b',
        apiKey: 'e2b-key',
        domain: 'eu.e2b.test',
        templateId: 'e2b-template',
      },
    })
    const workspace = await readWorkspace(runtime.env.DB, org.id, id)
    const environment = await sandboxEnvironment(runtime.env, {
      workspace: { ...workspace, providerAccount: account },
      environment: parseOrgEnvironment({ CONDUCTIVE_DISK_LINE_BYTES: '100' }),
      locations: await workspaceRepositoryLocations(runtime.env.DB, id),
      defaultBranch: 'main',
      diskKeepalive: false,
    })

    expect(
      Object.entries(environment).filter(
        ([name]) => name === 'CONDUCTIVE_DISK_LINE_BYTES',
      ),
    ).toEqual(diskValues)
  },
)
