import type {
  BuildLogEvent,
  BuildResponse,
  BuildsResponse,
  ImageBuild,
  OrgSettings,
  RepositoriesResponse,
  Repository,
} from '../../shared/org-settings'
import {
  count,
  countOrNull,
  flag,
  list,
  nested,
  object,
  oneOf,
  text,
  textOrNull,
} from './json'

type BuildKind = ImageBuild['kind']
type BuildState = ImageBuild['state']

const buildKinds: Readonly<Record<BuildKind, BuildKind>> = {
  build: 'build',
  refresh: 'refresh',
}
const buildStates: Readonly<Record<BuildState, BuildState>> = {
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
}

function repository(value: unknown): Repository {
  const source = object(value, 'repository')
  return {
    id: text(source, 'id'),
    orgId: text(source, 'orgId'),
    githubId: count(source, 'githubId'),
    fullName: text(source, 'fullName'),
    description: text(source, 'description'),
    defaultBranch: text(source, 'defaultBranch'),
    installationId: count(source, 'installationId'),
    selected: flag(source, 'selected'),
  }
}

export function parseRepositories(value: unknown): RepositoriesResponse {
  const source = object(value, 'repositories response')
  return { repositories: list(source, 'repositories', repository) }
}

/**
 * Keeps only the name and the Secret mark of each env var. A value never
 * reaches the screen. A reply without a mark counts as secret, the safe
 * side, as the Worker reads an old variable.
 */
function envVar(value: unknown): OrgSettings['envVars'][number] {
  const source = object(value, 'env var')
  return {
    name: text(source, 'name'),
    secret: source.secret === undefined ? true : flag(source, 'secret'),
  }
}

export function parseSettings(value: unknown): OrgSettings {
  const source = nested(object(value, 'settings response'), 'settings')
  return {
    installScript: text(source, 'installScript'),
    startupScript: text(source, 'startupScript'),
    envVars: list(source, 'envVars', envVar),
    updatedAt: count(source, 'updatedAt'),
    needsBuild: flag(source, 'needsBuild'),
  }
}

function imageBuild(value: unknown): ImageBuild {
  const source = object(value, 'build')
  return {
    id: text(source, 'id'),
    orgId: text(source, 'orgId'),
    kind: oneOf(source, 'kind', buildKinds),
    state: oneOf(source, 'state', buildStates),
    startedAt: count(source, 'startedAt'),
    completedAt: countOrNull(source, 'completedAt'),
    durationMs: countOrNull(source, 'durationMs'),
    error: textOrNull(source, 'error'),
  }
}

export function parseBuilds(value: unknown): BuildsResponse {
  const source = object(value, 'builds response')
  const changes = nested(source, 'changes')
  return {
    builds: list(source, 'builds', imageBuild),
    currentImageBuildId: textOrNull(source, 'currentImageBuildId'),
    changes: {
      installScript: flag(changes, 'installScript'),
      addedRepositories: list(changes, 'addedRepositories', changedRepository),
      removedRepositories: list(
        changes,
        'removedRepositories',
        changedRepository,
      ),
    },
  }
}

function changedRepository(value: unknown) {
  const source = object(value, 'changed repository')
  return { id: text(source, 'id'), fullName: text(source, 'fullName') }
}

function logEvent(value: unknown): BuildLogEvent {
  const source = object(value, 'log event')
  return {
    eventNumber: count(source, 'eventNumber'),
    occurredAt: count(source, 'occurredAt'),
    text: text(source, 'text'),
  }
}

export function parseBuild(value: unknown): BuildResponse {
  const source = object(value, 'build response')
  return {
    build: imageBuild(source.build),
    log: list(source, 'log', logEvent),
  }
}
