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

/** A change of an env var. A set sends a value, which the fake drops. */
function readEnvChange(value: unknown): { name: string; remove: boolean } {
  const change = record(value, 'env var')
  const remove = choice(change, 'operation', ['set', 'remove']) === 'remove'
  if (!remove) text(change, 'value')
  return { name: requiredText(change, 'name'), remove }
}

function envChanges(object: JsonObject, key: string) {
  return items(object, key, readEnvChange)
}

/**
 * The scripts and the env vars. Only the names of env vars stay, so no
 * reply holds a value. A changed install script asks for a build.
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
  let names = org.settings.envVars.map((item) => item.name)
  for (const change of changes) {
    if (change.remove) names = names.filter((name) => name !== change.name)
    else if (!names.includes(change.name)) names = [...names, change.name]
  }
  const current = org.settings
  const changedInstall =
    installScript !== undefined && installScript !== current.installScript
  org.settings = {
    ...current,
    installScript: installScript ?? current.installScript,
    startupScript: startupScript ?? current.startupScript,
    envVars: names.map((name) => ({ name })),
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
