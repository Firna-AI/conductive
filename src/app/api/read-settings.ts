import type { BaseImage } from '../../shared/base-image'
import type { OrgInvite, OrgMember } from '../../shared/members'
import type {
  BuildLogEvent,
  BuildResponse,
  BuildsResponse,
  ImageBuild,
  OrgSettings,
  Repository,
} from '../../shared/org-settings'
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
  }
}

export function readRepositories(value: unknown): Repository[] {
  return items(record(value, 'repositories'), 'repositories', readRepository)
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

/** The settings of the cloud computer. An older reply has no base image. */
export function readSettings(value: unknown): OrgSettings {
  const settings = record(record(value, 'settings').settings, 'settings')
  const baseImage = maybeNested(settings, 'baseImage', readBaseImage)
  return {
    ...(baseImage ? { baseImage } : {}),
    installScript: text(settings, 'installScript'),
    startupScript: text(settings, 'startupScript'),
    envVars: items(settings, 'envVars', readEnvVar),
    updatedAt: count(settings, 'updatedAt'),
    needsBuild: flag(settings, 'needsBuild'),
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

export function readBuilds(value: unknown): BuildsResponse {
  const body = record(value, 'builds')
  return {
    builds: items(body, 'builds', readBuild),
    currentImageBuildId: maybeText(body, 'currentImageBuildId'),
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
