import type {
  AccountResponse,
  AgentLoginStatus,
  GitHubInstallation,
  GitHubInstallationsResponse,
  GitHubRepositoriesResponse,
  GitHubRepository,
} from '../../shared/account'
import type {
  Agent,
  AgentChoice,
  AgentModel,
  Effort,
} from '../../shared/agents'
import type { OrgRole, User } from '../../shared/api'
import type { MessageSender } from '../../shared/messages'
import type { GetStartedResponse } from '../../shared/onboarding'
import type { OrgSummary } from '../../shared/orgs'
import type { Section } from '../../shared/sections'
import { getStartedOrder } from '../get-started'
import {
  choice,
  count,
  flag,
  items,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
} from './parse'

export const AGENTS = ['claude', 'codex'] as const satisfies readonly Agent[]
export const EFFORTS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const satisfies readonly Effort[]
const ROLES = ['admin', 'member'] as const satisfies readonly OrgRole[]

export function readUser(value: unknown): User {
  const user = record(value, 'user')
  return {
    id: text(user, 'id'),
    githubId: count(user, 'githubId'),
    githubLogin: text(user, 'githubLogin'),
    displayName: maybeText(user, 'displayName'),
    avatarUrl: maybeText(user, 'avatarUrl'),
  }
}

export function readSender(value: unknown): MessageSender {
  const sender = record(value, 'sender')
  return {
    id: text(sender, 'id'),
    githubLogin: text(sender, 'githubLogin'),
    displayName: maybeText(sender, 'displayName'),
    avatarUrl: maybeText(sender, 'avatarUrl'),
  }
}

export function readOrg(value: unknown): OrgSummary {
  const org = record(value, 'org')
  const deletion = maybeNested(org, 'deletion', (item) => {
    const fields = record(item, 'deletion')
    return {
      deletedAt: count(fields, 'deletedAt'),
      deletesAt: count(fields, 'deletesAt'),
    }
  })
  const suspension = maybeNested(org, 'suspension', (item) => ({
    suspendedAt: count(record(item, 'suspension'), 'suspendedAt'),
  }))
  const initials = maybeText(org, 'initials')
  return {
    id: text(org, 'id'),
    name: text(org, 'name'),
    role: choice(org, 'role', ROLES),
    ...(initials === null ? {} : { initials }),
    ...(suspension === null ? {} : { suspension }),
    ...(deletion === null ? {} : { deletion }),
  }
}

export function readSection(value: unknown): Section {
  const section = record(value, 'section')
  return {
    id: text(section, 'id'),
    orgId: text(section, 'orgId'),
    name: text(section, 'name'),
    position: count(section, 'position'),
    isDefault: flag(section, 'isDefault'),
    collapsed: flag(section, 'collapsed'),
  }
}

export function readChoice(value: unknown): AgentChoice {
  const fields = record(value, 'choice')
  return {
    agent: choice(fields, 'agent', AGENTS),
    model: text(fields, 'model'),
    effort: choice(fields, 'effort', EFFORTS),
  }
}

export function readModel(value: unknown): AgentModel {
  const model = record(value, 'model')
  return {
    agent: choice(model, 'agent', AGENTS),
    model: text(model, 'model'),
    label: text(model, 'label'),
    efforts: items(model, 'efforts', (effort) =>
      choice({ effort }, 'effort', EFFORTS),
    ),
  }
}

export function readLogin(value: unknown): AgentLoginStatus {
  const login = record(value, 'agent login')
  const agent = choice(login, 'agent', AGENTS)
  if (!flag(login, 'connected')) return { agent, connected: false }
  const updatedAt = count(login, 'updatedAt')
  const noReuse = flag(login, 'noReuse')
  return {
    agent,
    connected: true,
    kind: choice(login, 'kind', ['token', 'api-key']),
    noReuse,
    updatedAt,
  }
}

export function readAccount(value: unknown): AccountResponse {
  const account = record(value, 'account')
  return {
    user: nested(account, 'user', readUser),
    defaultChoice: nested(account, 'defaultChoice', readChoice),
    agentLogins: items(account, 'agentLogins', readLogin),
    githubAppUrl: text(account, 'githubAppUrl'),
  }
}

function readInstallation(value: unknown): GitHubInstallation {
  const installation = record(value, 'installation')
  return {
    id: count(installation, 'id'),
    account: text(installation, 'account'),
    repositoryCount: count(installation, 'repositoryCount'),
    settingsUrl: text(installation, 'settingsUrl'),
  }
}

export function readInstallations(value: unknown): GitHubInstallationsResponse {
  const body = record(value, 'installations')
  return {
    installations: items(body, 'installations', readInstallation),
    installUrl: text(body, 'installUrl'),
  }
}

function readGitHubRepository(value: unknown): GitHubRepository {
  const repository = record(value, 'repository')
  return {
    githubId: count(repository, 'githubId'),
    fullName: text(repository, 'fullName'),
    description: text(repository, 'description'),
    defaultBranch: text(repository, 'defaultBranch'),
    installationId: count(repository, 'installationId'),
  }
}

/** The repositories that the person and the GitHub App both reach. */
export function readGitHubRepositories(
  value: unknown,
): GitHubRepositoriesResponse {
  const body = record(value, 'repositories')
  return { repositories: items(body, 'repositories', readGitHubRepository) }
}

export function readGetStarted(value: unknown): GetStartedResponse {
  const body = record(value, 'get started')
  return {
    orgId: maybeText(body, 'orgId'),
    steps: items(body, 'steps', (item) => {
      const step = record(item, 'step')
      return {
        step: choice(step, 'step', getStartedOrder),
        complete: flag(step, 'complete'),
      }
    }),
  }
}
