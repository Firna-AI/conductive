import { boatKeyPath } from '../../shared/api'
import type {
  BoatKeyErrorCode,
  BoatKeyResponse,
  SaveBoatKeyResponse,
} from '../../shared/boat-key'
import {
  orgSettingsPaths,
  type OrgSettingsResponse,
  type RepositoriesResponse,
} from '../../shared/org-settings'
import { choice, items, record, text, type JsonObject } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import {
  ID,
  json,
  numbers,
  optional,
  requiredText,
  RouteError,
  type Params,
  type Route,
} from './router'
import { completeStep, type OrgState } from './state'

interface KeyRefusal {
  word: string
  status: number
  code: BoatKeyErrorCode
  message: string
}

/** The answers of the Worker when Boat refuses a key, by a word in the key. */
const refusals: readonly KeyRefusal[] = [
  {
    word: 'other',
    status: 409,
    code: 'boat_account_mismatch',
    message:
      'This key uses another Boat account. Use a key for the current account, or create a new org.',
  },
  {
    word: 'bad',
    status: 400,
    code: 'boat_key_refused',
    message: 'Boat refused this key. Check its expiry and permissions.',
  },
  {
    word: 'down',
    status: 502,
    code: 'boat_unavailable',
    message: 'Boat could not check the key. Try again.',
  },
]

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
    installScript: installScript ?? current.installScript,
    startupScript: startupScript ?? current.startupScript,
    envVars: names.map((name) => ({ name })),
    updatedAt: backend.now(),
    needsBuild: current.needsBuild || changedInstall,
  }
  return json({ settings: org.settings } satisfies OrgSettingsResponse)
}

function setRepositories(org: OrgState, body: unknown): Response {
  const chosen = numbers(record(body), 'githubRepositoryIds')
  org.repositories = org.repositories.map((repository) => ({
    ...repository,
    selected: chosen.includes(repository.githubId),
  }))
  return json({ repositories: org.repositories } satisfies RepositoriesResponse)
}

/**
 * Save Boat key. A word in the key picks a refusal of Boat. Any other key
 * saves, and the answer holds only its last four characters.
 */
function saveBoatKey(
  backend: DevBackend,
  org: OrgState,
  body: unknown,
): Response {
  const key = requiredText(record(body), 'key')
  const refusal = refusals.find((item) => key.includes(item.word))
  if (refusal) {
    throw new RouteError(refusal.status, refusal.code, refusal.message)
  }
  org.boatKey = {
    configured: true,
    updatedAt: backend.now(),
    lastFour: key.slice(-4),
  }
  if (backend.state.getStarted.orgId === org.org.id) {
    completeStep(backend.state, 'boat-key')
  }
  return json(org.boatKey satisfies SaveBoatKeyResponse)
}

/** The repositories, the scripts and env vars, and the Boat key of an org. */
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
      path: orgSettingsPaths.repositories(ID.org),
      answer: ({ params, body }) => setRepositories(orgOf(params), body),
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
    {
      method: 'GET',
      path: boatKeyPath(ID.org),
      answer: ({ params }) =>
        json(orgOf(params).boatKey satisfies BoatKeyResponse),
    },
    {
      method: 'PUT',
      path: boatKeyPath(ID.org),
      answer: ({ params, body }) => saveBoatKey(backend, orgOf(params), body),
    },
  ]
}
