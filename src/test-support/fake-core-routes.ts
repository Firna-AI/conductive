import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type SessionResponse,
} from '../shared/account'
import { MODELS_PATH } from '../shared/agents'
import { API_PATHS, orgPath, type OrgRole } from '../shared/api'
import { HEALTH_PATH } from '../shared/health'
import {
  invitePath,
  invitesPath,
  memberPath,
  membersPath,
  PENDING_ORG_INVITES_PATH,
} from '../shared/members'
import { GET_STARTED_PATH } from '../shared/onboarding'
import {
  buildPath,
  orgSettingsPaths,
  repositoryPath,
} from '../shared/org-settings'
import { deleteOrgPath, leaveOrgPath, restoreOrgPath } from '../shared/orgs'
import { sectionPath, sectionsPath } from '../shared/sections'
import type { SaveShortcutsResponse } from '../shared/shortcuts'
import { WAITLIST_PATHS } from '../shared/waitlist'
import type { FakeRouteWriter } from './fake-api-routes'
import { coreFixtures, FAKE_IDS, FAKE_TIME } from './fixtures/core'
import { accessState } from './fixtures/waitlist'

export function fakeCoreRoutes(routes: FakeRouteWriter, role: OrgRole) {
  const data = coreFixtures(role)
  const org = data.orgs.orgs[0]
  const id = FAKE_IDS.org
  routes.json('GET', HEALTH_PATH, { status: 'ok' })
  routes.json('GET', API_PATHS.session, {
    user: data.account.user,
    appAccess: true,
  } satisfies SessionResponse)
  routes.json('GET', WAITLIST_PATHS.state, accessState)
  routes.empty('POST', API_PATHS.signOut)
  routes.json('GET', ACCOUNT_PATHS.account, data.account)
  routes.json('GET', MODELS_PATH, data.models)
  routes.json(
    'GET',
    ACCOUNT_PATHS.githubInstallations,
    data.githubInstallations,
  )
  routes.json('GET', ACCOUNT_PATHS.githubRepositories, data.githubRepositories)
  routes.json('PUT', ACCOUNT_PATHS.defaultModel, {
    choice: data.account.defaultChoice,
  })
  routes.json('PUT', ACCOUNT_PATHS.newWorkspaceView, {
    view: data.account.newWorkspaceView,
  })
  routes.json('PUT', ACCOUNT_PATHS.shortcuts, {
    keyboard: 'mac',
    changes: data.account.shortcuts.mac,
  } satisfies SaveShortcutsResponse)
  routes.json('POST', ACCOUNT_PATHS.deleteAccount, { deleted: true })
  for (const login of data.account.agentLogins) {
    routes.json('PUT', agentLoginPath(login.agent), login)
    routes.json('PATCH', agentLoginPath(login.agent), login)
    routes.empty('DELETE', agentLoginPath(login.agent))
  }
  routes.json('GET', GET_STARTED_PATH, data.getStarted)
  routes.json('GET', PENDING_ORG_INVITES_PATH, { invites: [] })
  routes.json('GET', API_PATHS.orgs, data.orgs)
  routes.json('POST', API_PATHS.orgs, data.createdOrg, 201)
  routes.json('GET', orgPath(id), { org })
  routes.json('PATCH', orgPath(id), { org })
  routes.json('POST', deleteOrgPath(id), {
    org: {
      ...org,
      deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 604_800_000 },
    },
  })
  routes.json('POST', restoreOrgPath(id), { org })
  routes.empty('POST', leaveOrgPath(id))
  routes.json('GET', sectionsPath(id), data.sectionList)
  routes.json(
    'POST',
    sectionsPath(id),
    { section: data.sectionList.sections[1] },
    201,
  )
  for (const section of data.sectionList.sections) {
    routes.json('PATCH', sectionPath(id, section.id), { section })
    routes.empty('DELETE', sectionPath(id, section.id))
  }
  routes.json('GET', orgSettingsPaths.repositories(id), data.repositories)
  for (const repository of data.repositories.repositories) {
    for (const method of ['PUT', 'DELETE'] as const) {
      routes.json(method, repositoryPath(id, repository.id), {
        repositories: data.repositories.repositories.map((item) => ({
          ...item,
          selected:
            item.id === repository.id ? method === 'PUT' : item.selected,
        })),
      })
    }
  }
  routes.json('GET', orgSettingsPaths.settings(id), data.settings)
  routes.json('PATCH', orgSettingsPaths.settings(id), data.settings)
  routes.json('GET', orgSettingsPaths.builds(id), data.builds)
  routes.json('POST', orgSettingsPaths.builds(id), data.build, 202)
  routes.json('POST', orgSettingsPaths.refresh(id), data.build, 202)
  routes.json('GET', buildPath(id, FAKE_IDS.build), data.build)
  routes.json('GET', membersPath(id), data.members)
  routes.json('POST', invitesPath(id), { invite: data.members.invites[0] }, 201)
  for (const member of data.members.members) {
    routes.json('PATCH', memberPath(id, member.user.id), { member })
    routes.empty('DELETE', memberPath(id, member.user.id))
  }
  for (const invite of data.members.invites) {
    routes.empty('DELETE', invitePath(id, invite.id))
  }
}
