import { describe, expect, it } from 'vitest'
import {
  invitePath,
  invitesPath,
  memberPath,
  membersPath,
  workspaceOwnerPath,
} from '../../shared/members'
import { orgSettingsPaths } from '../../shared/org-settings'
import { deleteOrgPath, restoreOrgPath } from '../../shared/orgs'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { ApiRequestError, createMembersApi, type MembersApi } from './client'

const org = FAKE_IDS.org

async function lastRequest(server: FakeApiServer) {
  const request = server.requests.at(-1)
  if (!request) throw new Error('The client sent no request.')
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    contentType: request.headers.get('Content-Type'),
    body: await request.text(),
  }
}

describe('createMembersApi', () => {
  it('sends_each_write_as_a_json_object_to_its_contract_path', async () => {
    const cases: {
      name: string
      call: (api: MembersApi) => Promise<unknown>
      method: string
      path: string
      body: unknown
    }[] = [
      {
        name: 'invite',
        call: (api) => api.invite(org, { githubLogin: 'octocat' }),
        method: 'POST',
        path: invitesPath(org),
        body: { githubLogin: 'octocat' },
      },
      {
        name: 'cancel invite',
        call: (api) => api.cancelInvite(org, 'invite-0'),
        method: 'DELETE',
        path: invitePath(org, 'invite-0'),
        body: {},
      },
      {
        name: 'change role',
        call: (api) => api.changeRole(org, 'jonas', { role: 'admin' }),
        method: 'PATCH',
        path: memberPath(org, 'jonas'),
        body: { role: 'admin' },
      },
      {
        name: 'remove member',
        call: (api) => api.removeMember(org, 'priya'),
        method: 'DELETE',
        path: memberPath(org, 'priya'),
        body: {},
      },
      {
        name: 'reassign workspace',
        call: (api) =>
          api.reassignWorkspace(org, FAKE_IDS.workspace, { userId: 'priya' }),
        method: 'PUT',
        path: workspaceOwnerPath(org, FAKE_IDS.workspace),
        body: { userId: 'priya' },
      },
      {
        name: 'delete org',
        call: (api) => api.deleteOrg(org, { name: 'Acme' }),
        method: 'POST',
        path: deleteOrgPath(org),
        body: { name: 'Acme' },
      },
      {
        name: 'restore org',
        call: (api) => api.restoreOrg(org),
        method: 'POST',
        path: restoreOrgPath(org),
        body: {},
      },
    ]
    for (const item of cases) {
      const server = new FakeApiServer()
      await item.call(createMembersApi(server.fetch))
      const request = await lastRequest(server)
      expect({ case: item.name, ...request }).toEqual({
        case: item.name,
        method: item.method,
        path: item.path,
        contentType: 'application/json',
        body: JSON.stringify(item.body),
      })
    }
  })

  it('rejects_with_the_code_and_message_of_the_api_when_a_write_fails', async () => {
    const server = new FakeApiServer()
    const message = 'Make another member an admin first.'
    server.json(
      'DELETE',
      memberPath(org, 'priya'),
      { error: { code: 'last_admin', message } },
      409,
    )
    const removal = createMembersApi(server.fetch).removeMember(org, 'priya')
    await expect(removal).rejects.toBeInstanceOf(ApiRequestError)
    await expect(removal).rejects.toMatchObject({
      status: 409,
      code: 'last_admin',
      message,
    })
  })

  it('rejects_a_body_that_does_not_match_the_contract', async () => {
    const server = new FakeApiServer()
    server.json('GET', membersPath(org), {
      members: [{ user: { id: 'priya' }, role: 'owner', joinedAt: 1 }],
      invites: [],
    })
    await expect(
      createMembersApi(server.fetch).members(org),
    ).rejects.toMatchObject({ status: 200, code: 'invalid_response' })
  })

  it('keeps_only_the_names_of_the_env_vars', async () => {
    const server = new FakeApiServer({ role: 'member' })
    server.json('GET', orgSettingsPaths.settings(org), {
      settings: {
        installScript: '',
        startupScript: '',
        envVars: [{ name: 'DATABASE_URL', value: 'postgres://secret' }],
        updatedAt: 1,
        needsBuild: false,
      },
    })
    const settings = await createMembersApi(server.fetch).settings(org)
    expect(settings.envVars).toEqual([{ name: 'DATABASE_URL' }])
  })
})
