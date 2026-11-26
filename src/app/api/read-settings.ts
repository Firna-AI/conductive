import type { BaseImage } from '../../shared/base-image'
import type { OrgInvite, OrgMember } from '../../shared/members'
import type {
  BuildLogEvent,
  BuildResponse,
  BuildsResponse,
  ImageBuild,
  OrgSettings,
  Repository,
  SkillsRepositoryLookupResponse,
  RepositoryOrderResponse,
} from '../../shared/org-settings'
import type { SkillFolderClash } from '../../shared/skill-folders'
import {
  choice,
  count,
  flag,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
  texts,
} from './parse'
import { readUser } from './read-core'

function readRepository(value: unknown): Repository {
  const repository = record(value, 'repository')
  return {
    id: text(repository, 'id'),
    orgId: text(repository, 'orgId'),
    githubId: count(repository, 'githubId'),
    fullName: text(repository, 'fullName'),
    description: text(repository, 'description'),
    defaultBranch: text(repository, 'defaultBranch'),
    installationId: count(repository, 'installationId'),
    selected: flag(repository, 'selected'),
    ...(repository.ready === undefined
      ? {}
      : { ready: flag(repository, 'ready') }),
    ...(repository.imageReady === undefined
      ? {}
      : { imageReady: flag(repository, 'imageReady') }),
  }
}

export function readRepositories(value: unknown): Repository[] {
  return items(record(value, 'repositories'), 'repositories', readRepository)
}

export function readRepositoryOrder(value: unknown): RepositoryOrderResponse {
  return { order: texts(record(value, 'order'), 'order') }
}

function readBaseImage(value: unknown): BaseImage {
  const image = record(value, 'baseImage')
  return {
    operatingSystem: text(image, 'operatingSystem'),
    software: texts(image, 'software'),
  }
}

/**
 * An env var by its name and its Secret mark. The reader keeps no other
 * field, so a value never reaches a screen. A reply without a mark counts
 * as secret, the safe side, as the Worker reads an old variable.
 */
function readEnvVar(value: unknown): OrgSettings['envVars'][number] {
  const envVar = record(value, 'env var')
  return {
    name: text(envVar, 'name'),
    secret: envVar.secret === undefined ? true : flag(envVar, 'secret'),
  }
}

/**
 * The settings of the cloud computer. An older reply has no base image and
 * no skills repository or trusted repository.
 */
export function readSettings(value: unknown): OrgSettings {
  const settings = record(record(value, 'settings').settings, 'settings')
  const baseImage = maybeNested(settings, 'baseImage', readBaseImage)
  const skillsRepository = maybeText(settings, 'skillsRepository')
  return {
    ...(baseImage ? { baseImage } : {}),
    installScript: text(settings, 'installScript'),
    startupScript: text(settings, 'startupScript'),
    ...(skillsRepository === null ? {} : { skillsRepository }),
    trustedSkillsRepository:
      maybeText(settings, 'trustedSkillsRepository') ?? '',
    envVars: items(settings, 'envVars', readEnvVar),
    updatedAt: count(settings, 'updatedAt'),
  }
}

/** The causes of a notice in place of the list of skills. */
const skillsNotices = [
  'private',
  'not-found',
  'no-skills',
  'incomplete',
  'failed',
] as const satisfies readonly NonNullable<
  SkillsRepositoryLookupResponse['notice']
>[]

/** Two skill folders with one name, of which only the first loads. */
function readSkillClash(value: unknown): SkillFolderClash {
  const clash = record(value, 'skill clash')
  return {
    name: text(clash, 'name'),
    keptPath: text(clash, 'keptPath'),
    skippedPath: text(clash, 'skippedPath'),
  }
}

/**
 * What the lookup of the saved skills repository found on GitHub: the
 * names of its skill folders, or the cause of a notice in place of them.
 */
export function readSkillsLookup(
  value: unknown,
): SkillsRepositoryLookupResponse {
  const lookup = record(value, 'skills lookup')
  return {
    repository: text(lookup, 'repository'),
    skills: texts(lookup, 'skills'),
    notice:
      lookup.notice === null ? null : choice(lookup, 'notice', skillsNotices),
    clashes: items(lookup, 'clashes', readSkillClash),
  }
}

function readBuild(value: unknown): ImageBuild {
  const build = record(value, 'build')
  return {
    id: text(build, 'id'),
    orgId: text(build, 'orgId'),
    kind: choice(build, 'kind', ['build', 'refresh']),
    state: choice(build, 'state', ['running', 'succeeded', 'failed']),
    startedAt: count(build, 'startedAt'),
    completedAt: maybeCount(build, 'completedAt'),
    durationMs: maybeCount(build, 'durationMs'),
    error: maybeText(build, 'error'),
    storageTotalBytes: maybeCount(build, 'storageTotalBytes'),
    storageFreeBytes: maybeCount(build, 'storageFreeBytes'),
  }
}

function readLogEvent(value: unknown): BuildLogEvent {
  const event = record(value, 'log event')
  return {
    eventNumber: count(event, 'eventNumber'),
    occurredAt: count(event, 'occurredAt'),
    text: text(event, 'text'),
  }
}

function readChangedRepository(value: unknown) {
  const repository = record(value, 'changed repository')
  return { id: text(repository, 'id'), fullName: text(repository, 'fullName') }
}

function readBuildChanges(value: unknown): BuildsResponse['changes'] {
  const changes = record(value, 'build changes')
  return {
    installScript: flag(changes, 'installScript'),
    addedRepositories: items(
      changes,
      'addedRepositories',
      readChangedRepository,
    ),
    removedRepositories: items(
      changes,
      'removedRepositories',
      readChangedRepository,
    ),
  }
}

export function readBuilds(value: unknown): BuildsResponse {
  const body = record(value, 'builds')
  return {
    builds: items(body, 'builds', readBuild),
    currentImageBuildId: maybeText(body, 'currentImageBuildId'),
    changes: nested(body, 'changes', readBuildChanges),
  }
}

export function readBuildResponse(value: unknown): BuildResponse {
  const body = record(value, 'build response')
  return {
    build: nested(body, 'build', readBuild),
    log: items(body, 'log', readLogEvent),
  }
}

function readMember(value: unknown): OrgMember {
  const member = record(value, 'member')
  return {
    user: nested(member, 'user', readUser),
    role: choice(member, 'role', ['admin', 'member']),
    joinedAt: count(member, 'joinedAt'),
  }
}

function readInvite(value: unknown): OrgInvite {
  const invite = record(value, 'invite')
  return {
    id: text(invite, 'id'),
    email: text(invite, 'email'),
    createdAt: count(invite, 'createdAt'),
  }
}

export function readMembers(value: unknown): {
  members: OrgMember[]
  invites: OrgInvite[]
} {
  const body = record(value, 'members')
  return {
    members: items(body, 'members', readMember),
    invites: items(body, 'invites', readInvite),
  }
}
