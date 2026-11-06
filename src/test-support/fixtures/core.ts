import {
  agents,
  defaultChoice,
} from '../../../docs/mockups/src/fixtures/agents'
import {
  envVars,
  installScript,
  startupScript,
} from '../../../docs/mockups/src/fixtures/computer'
import {
  acmeInvites,
  acmeMembers,
  people,
} from '../../../docs/mockups/src/fixtures/members'
import { installations, orgList } from '../../../docs/mockups/src/fixtures/orgs'
import { acmeRepositories } from '../../../docs/mockups/src/fixtures/repositories'
import { sections } from '../../../docs/mockups/src/fixtures/sections'
import type {
  AccountResponse,
  GitHubInstallationsResponse,
} from '../../shared/account'
import type { ModelsResponse } from '../../shared/agents'
import type { BoatKeyStatus, OrgRole, User } from '../../shared/api'
import type { MembersResponse } from '../../shared/members'
import type { GetStartedResponse } from '../../shared/onboarding'
import type {
  BuildResponse,
  BuildsResponse,
  OrgSettingsResponse,
  RepositoriesResponse,
} from '../../shared/org-settings'
import type { OrgsResponse } from '../../shared/orgs'
import type { SectionsResponse } from '../../shared/sections'

export const FAKE_ORIGIN = 'https://app.conducting.test'
export const FAKE_TIME = 1_800_000_000_000
export const FAKE_IDS = {
  org: 'acme',
  workspace: 'checkout-autocomplete',
  session: 'autocomplete',
  build: 'build-1',
  preview: 'preview-1',
} as const

export const fakeUsers: readonly User[] = Object.values(people).map(
  (person, index) => ({
    id: person.key,
    githubId: index + 1,
    githubLogin: person.login,
    displayName: person.name,
    avatarUrl: null,
  }),
)
export const fakeUser = fakeUsers[0]

export function coreFixtures(role: OrgRole = 'admin') {
  const account: AccountResponse = {
    user: role === 'member' ? fakeUsers[1] : fakeUser,
    defaultChoice,
    agentLogins: [
      { agent: 'claude', connected: true, kind: 'token', updatedAt: FAKE_TIME },
      {
        agent: 'codex',
        connected: true,
        kind: 'api-key',
        updatedAt: FAKE_TIME,
      },
    ],
  }
  const models: ModelsResponse = {
    models: Object.values(agents).flatMap((agent) =>
      agent.models.map((model) => ({
        agent: agent.key,
        model: model.name,
        label: model.name,
        efforts: model.efforts,
      })),
    ),
  }
  const orgs: OrgsResponse = {
    orgs: orgList.map((org) => ({ id: org.key, name: org.name, role })),
  }
  const repositories: RepositoriesResponse = {
    repositories: acmeRepositories.map((repo, index) => ({
      id: repo.name.split('/')[1],
      orgId: FAKE_IDS.org,
      githubId: index + 1,
      fullName: repo.name,
      description: repo.description,
      defaultBranch: 'main',
      installationId: 1,
      selected: repo.used,
    })),
  }
  const sectionList: SectionsResponse = {
    sections: Object.values(sections).map((section, position) => ({
      id: section.key,
      orgId: FAKE_IDS.org,
      name: section.name,
      position,
      isDefault: section.key === 'general',
      collapsed: section.collapsed,
    })),
  }
  const members: MembersResponse = {
    members: acmeMembers.map((member) => ({
      user: fakeUsers.find((user) => user.id === member.person) ?? fakeUser,
      role: member.role,
      joinedAt: FAKE_TIME - 86_400_000,
    })),
    invites: acmeInvites.map((invite, index) => ({
      id: `invite-${index}`,
      githubLogin: invite.login,
      createdAt: FAKE_TIME - 172_800_000,
    })),
  }
  const settings: OrgSettingsResponse = {
    settings: {
      installScript,
      startupScript,
      envVars,
      updatedAt: FAKE_TIME,
      needsBuild: false,
    },
  }
  const build: BuildResponse = {
    build: {
      id: FAKE_IDS.build,
      orgId: FAKE_IDS.org,
      kind: 'build',
      state: 'succeeded',
      startedAt: FAKE_TIME - 401_000,
      completedAt: FAKE_TIME,
      durationMs: 401_000,
      error: null,
    },
    log: [
      {
        eventNumber: 1,
        occurredAt: FAKE_TIME,
        text: 'The cloud computer is ready.\n',
      },
    ],
  }
  const builds: BuildsResponse = {
    builds: [build.build],
    currentImageBuildId: build.build.id,
  }
  const githubInstallations: GitHubInstallationsResponse = {
    installations: installations.map((installation, index) => ({
      id: index + 1,
      account: installation.account,
      repositoryCount: installation.repositories,
      settingsUrl: `https://github.com/organizations/${installation.account}/settings/installations/${index + 1}`,
    })),
    installUrl: 'https://github.com/apps/conducting/installations/new',
  }
  const getStarted: GetStartedResponse = {
    orgId: FAKE_IDS.org,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: true },
      { step: 'boat-key', complete: true },
      { step: 'agent-login', complete: true },
    ],
  }
  const boatKey: BoatKeyStatus = {
    configured: true,
    updatedAt: FAKE_TIME,
    lastFour: '7k2q',
  }
  return {
    account,
    models,
    orgs,
    repositories,
    sectionList,
    members,
    settings,
    build,
    builds,
    githubInstallations,
    getStarted,
    boatKey,
  }
}
