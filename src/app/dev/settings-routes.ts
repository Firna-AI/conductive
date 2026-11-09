import {
  orgSettingsPaths,
  repositoryPath,
  type OrgSettingsResponse,
  type RepositoriesResponse,
} from '../../shared/org-settings'
import { choice, items, record, text, type JsonObject } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
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
 * The scripts and the env vars. Only the names and the marks of env vars
 * stay, so no reply holds a value. A changed install script asks for a
 * build.
 */
function updateSettings(
  backend: DevBackend,
  org: OrgState,
  body: unknown,
): Response {
  const fields = record(body)
  const installScript = optional(fields, 'installScript', text)
  const startupScript = optional(fields, 'startupScript', text)
  const changes = optional(fields, 'envVars', envChanges) ?? []
  const current = org.settings
  const changedInstall =
    installScript !== undefined && installScript !== current.installScript
  org.settings = {
    ...current,
    installScript: installScript ?? current.installScript,
    startupScript: startupScript ?? current.startupScript,
    envVars: changes.reduce(applyEnvChange, current.envVars),
    updatedAt: backend.now(),
    needsBuild: current.needsBuild || changedInstall,
  }
  return json({ settings: org.settings } satisfies OrgSettingsResponse)
}

function setRepository(
  org: OrgState,
  repositoryId: string,
  selected: boolean,
): Response {
  org.repositories = org.repositories.map((repository) =>
    repository.id === repositoryId ? { ...repository, selected } : repository,
  )
  return json({ repositories: org.repositories } satisfies RepositoriesResponse)
}

/** The repositories, and the scripts and env vars of an org. */
export function settingsRoutes(backend: DevBackend): Route[] {
  const orgOf = (params: Params) => requireOrg(backend.state, params.org)
  return [
    {
      method: 'GET',
      path: orgSettingsPaths.repositories(ID.org),
      answer: ({ params }) =>
        json({
          repositories: orgOf(params).repositories,
        } satisfies RepositoriesResponse),
    },
    {
      method: 'PUT',
      path: repositoryPath(ID.org, ID.repository),
      answer: ({ params }) =>
        setRepository(orgOf(params), params.repository, true),
    },
    {
      method: 'DELETE',
      path: repositoryPath(ID.org, ID.repository),
      answer: ({ params }) =>
        setRepository(orgOf(params), params.repository, false),
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
