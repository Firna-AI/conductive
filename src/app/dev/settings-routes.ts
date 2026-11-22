import {
  compareRepositoryNames,
  buildsAtAdd,
  orgSettingsPaths,
  repositoryPath,
  repositoryPositionPath,
  type OrgSettingsResponse,
  type RepositoriesResponse,
  type RepositoryOrderResponse,
  type Repository,
} from '../../shared/org-settings'
import { savedSkillsRepositorySettings } from '../../shared/skills-repository-settings'
import {
  choice,
  count,
  items,
  record,
  text,
  type JsonObject,
} from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import { imageRepositories } from './build-changes'
import { startBuild } from './build-routes'
import {
  ID,
  json,
  optional,
  requiredText,
  type Params,
  type Route,
} from './router'
import type { OrgState } from './state'

/** A set without a mark replaces only the value, and keeps the mark. */
type EnvChange =
  | { operation: 'set'; name: string; secret?: boolean }
  | { operation: 'classify'; name: string; secret: boolean }
  | { operation: 'remove'; name: string }

/**
 * A change of an env var. A set sends a value, which the fake drops. As in
 * the Worker, a mark is secret unless the change says `false`.
 */
function readEnvChange(value: unknown): EnvChange {
  const change = record(value, 'env var')
  const name = requiredText(change, 'name')
  const operation = choice(change, 'operation', ['set', 'classify', 'remove'])
  if (operation === 'remove') return { operation, name }
  const secret = change.secret !== false
  if (operation === 'classify') return { operation, name, secret }
  text(change, 'value')
  return change.secret === undefined
    ? { operation, name }
    : { operation, name, secret }
}

type EnvVars = OrgState['settings']['envVars']

/**
 * The variables after one change. A set adds a new name at the end, which
 * starts secret when the set has no mark. A set without a mark keeps the
 * mark of a known name. A classify of a missing name changes nothing.
 */
function applyEnvChange(vars: EnvVars, change: EnvChange): EnvVars {
  if (change.operation === 'remove') {
    return vars.filter((item) => item.name !== change.name)
  }
  const known = vars.some((item) => item.name === change.name)
  if (change.operation === 'set' && !known) {
    return [...vars, { name: change.name, secret: change.secret ?? true }]
  }
  return vars.map((item) =>
    item.name === change.name
      ? { ...item, secret: change.secret ?? item.secret }
      : item,
  )
}

function envChanges(object: JsonObject, key: string) {
  return items(object, key, readEnvChange)
}

/**
 * The scripts, the env vars, and the skills repository. Only the names and
 * the marks of env vars stay, so no reply holds a value. A changed install
 * script asks for a build. With `skillsSave=fail`, the first save that
 * names the skills repository or its trust fails and changes nothing.
 */
function updateSettings(
  backend: DevBackend,
  org: OrgState,
  body: unknown,
): Response {
  const fields = record(body)
  const installScript = optional(fields, 'installScript', text)
  const startupScript = optional(fields, 'startupScript', text)
  const skillsRepository = optional(fields, 'skillsRepository', text)
  const trustedSkillsRepository = optional(
    fields,
    'trustedSkillsRepository',
    text,
  )
  const changes = optional(fields, 'envVars', envChanges) ?? []
  const namesSkills =
    skillsRepository !== undefined || trustedSkillsRepository !== undefined
  if (namesSkills && backend.state.skillsSaveFails) {
    backend.state.skillsSaveFails = false
    throw new Error('The save failed.')
  }
  const current = org.settings
  const changedInstall =
    installScript !== undefined && installScript !== current.installScript
  org.settings = {
    ...current,
    installScript: installScript ?? current.installScript,
    startupScript: startupScript ?? current.startupScript,
    ...savedSkillsRepositorySettings(current, {
      skillsRepository,
      trustedSkillsRepository,
    }),
    envVars: changes.reduce(applyEnvChange, current.envVars),
    updatedAt: backend.now(),
  }
  if (changedInstall) org.settingsRevision += 1
  return json({ settings: org.settings } satisfies OrgSettingsResponse)
}

/**
 * The repositories in the order of the Worker: the chosen ones first, in
 * the repository order of the org, which is their order in the list, then
 * the others in the name order.
 */
function inRepositoryOrder(
  repositories: readonly Repository[],
): readonly Repository[] {
  return [
    ...repositories.filter((repository) => repository.selected),
    ...repositories
      .filter((repository) => !repository.selected)
      .sort(compareRepositoryNames),
  ]
}

/**
 * The repositories of the org in the order of the Worker, also after an
 * add or a removal. As in the Worker, each says whether the org has a good
 * image, and whether that image holds it, also a repository that the org
 * no longer chose.
 */
function repositoriesReply(org: OrgState): Response {
  const held = new Set(imageRepositories(org).map(({ id }) => id))
  const imageReady = org.currentImageBuildId !== null
  return json({
    repositories: inRepositoryOrder(org.repositories).map((repository) => ({
      ...repository,
      ready: held.has(repository.id),
      imageReady,
    })),
  } satisfies RepositoriesResponse)
}

/**
 * Moves a chosen repository to `index` of the repository order, which
 * counts the chosen repositories without the moved one. A repository that
 * is not chosen moves nothing. A move starts no build.
 */
function moveRepository(
  org: OrgState,
  repositoryId: string,
  body: unknown,
): Response {
  const index = count(record(body), 'index')
  const ordered = inRepositoryOrder(org.repositories)
  const moved = ordered.find(
    (repository) => repository.id === repositoryId && repository.selected,
  )
  if (moved) {
    const chosen = ordered.filter(
      (repository) => repository.selected && repository !== moved,
    )
    const at = Math.min(Math.max(0, Math.round(index)), chosen.length)
    org.repositories = [
      ...chosen.slice(0, at),
      moved,
      ...chosen.slice(at),
      ...ordered.filter((repository) => !repository.selected),
    ]
  }
  return json({
    order: org.repositories
      .filter((repository) => repository.selected)
      .map((repository) => repository.id),
  } satisfies RepositoryOrderResponse)
}

/**
 * Chooses a repository of the org, or removes it. A newly chosen
 * repository goes to the end of the repository order. A removal turns off
 * each automation in the repository with the reason that its page shows,
 * as the Worker does. An add starts a build unless the body says
 * `build: false`.
 */
function setRepository(
  backend: DevBackend,
  org: OrgState,
  repositoryId: string,
  change: { selected: boolean; build: boolean },
  now: number,
): Response {
  const { selected } = change
  const changed = org.repositories.some(
    (repository) =>
      repository.id === repositoryId && repository.selected !== selected,
  )
  const updated = org.repositories.map((repository) =>
    repository.id === repositoryId ? { ...repository, selected } : repository,
  )
  org.repositories =
    changed && selected
      ? [
          ...updated.filter((repository) => repository.id !== repositoryId),
          ...updated.filter((repository) => repository.id === repositoryId),
        ]
      : updated
  if (!selected) {
    org.automations = org.automations.map((automation) =>
      automation.repositoryId === repositoryId
        ? {
            ...automation,
            active: false,
            inactiveReason: 'repository_removed',
            nextRunAt: null,
            updatedAt: now,
          }
        : automation,
    )
  }
  if (changed) org.settingsRevision += 1
  if (changed && selected && change.build) startBuild(backend, org)
  return repositoriesReply(org)
}

/** The repositories, and the scripts and env vars of an org. */
export function settingsRoutes(backend: DevBackend): Route[] {
  const orgOf = (params: Params) => requireOrg(backend.state, params.org)
  return [
    {
      method: 'GET',
      path: orgSettingsPaths.repositories(ID.org),
      answer: ({ params }) => repositoriesReply(orgOf(params)),
    },
    {
      method: 'PUT',
      path: repositoryPositionPath(ID.org, ID.repository),
      answer: ({ params, body }) =>
        moveRepository(orgOf(params), params.repository, body),
    },
    {
      method: 'PUT',
      path: repositoryPath(ID.org, ID.repository),
      answer: ({ params, body }) =>
        setRepository(
          backend,
          orgOf(params),
          params.repository,
          { selected: true, build: buildsAtAdd(body) },
          backend.now(),
        ),
    },
    {
      method: 'DELETE',
      path: repositoryPath(ID.org, ID.repository),
      answer: ({ params }) =>
        setRepository(
          backend,
          orgOf(params),
          params.repository,
          { selected: false, build: false },
          backend.now(),
        ),
    },
    {
      method: 'GET',
      path: orgSettingsPaths.settings(ID.org),
      answer: ({ params }) =>
        json({
          settings: orgOf(params).settings,
        } satisfies OrgSettingsResponse),
    },
    {
      method: 'PATCH',
      path: orgSettingsPaths.settings(ID.org),
      answer: ({ params, body }) =>
        updateSettings(backend, orgOf(params), body),
    },
  ]
}
