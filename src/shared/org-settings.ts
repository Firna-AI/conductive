import type { Timestamp } from './generated/Timestamp'
import type { Agent } from './generated/Agent'
import { orgPath } from './api'
import type { BaseImage } from './base-image'
import type { SkillFolderClash } from './skill-folders'

export const orgSettingsPaths = {
  repositories: (orgId: string) => `${orgPath(orgId)}/repositories`,
  settings: (orgId: string) => `${orgPath(orgId)}/settings`,
  skills: (orgId: string) => `${orgPath(orgId)}/settings/skills`,
  agentLogins: (orgId: string) => `${orgPath(orgId)}/agent-logins`,
  builds: (orgId: string) => `${orgPath(orgId)}/builds`,
  refresh: (orgId: string) => `${orgPath(orgId)}/image/refresh`,
} as const

export function orgAgentLoginPath(orgId: string, agent: Agent): string {
  return `${orgSettingsPaths.agentLogins(orgId)}/${agent}`
}

export function refreshOrgAgentLoginModelsPath(
  orgId: string,
  agent: Agent,
): string {
  return `${orgAgentLoginPath(orgId, agent)}/models/refresh`
}

export function repositoryPath(orgId: string, repositoryId: string): string {
  return `${orgSettingsPaths.repositories(orgId)}/${encodeURIComponent(repositoryId)}`
}

export const REPOSITORY_POSITION_SUFFIX = '/position'

/** The move of a chosen repository in the repository order of the org. */
export function repositoryPositionPath(
  orgId: string,
  repositoryId: string,
): string {
  return `${repositoryPath(orgId, repositoryId)}${REPOSITORY_POSITION_SUFFIX}`
}

export function buildPath(orgId: string, buildId: string): string {
  return `${orgSettingsPaths.builds(orgId)}/${encodeURIComponent(buildId)}`
}
export function buildEventsPath(orgId: string, buildId: string): string {
  return `${buildPath(orgId, buildId)}/events`
}

export interface Repository {
  id: string
  orgId: string
  githubId: number
  fullName: string
  description: string
  defaultBranch: string
  installationId: number
  selected: boolean
  /** The current org image holds this repository. Older replies omit it. */
  ready?: boolean
  /** The current account has a published org image. Older replies omit it. */
  imageReady?: boolean
}

/**
 * A move of a chosen repository. `index` counts the chosen repositories
 * without the moved one. The reply is a `RepositoryOrderResponse`.
 */
export interface MoveRepositoryRequest {
  index: number
}
/**
 * The saved repository order of an org: the IDs of its chosen
 * repositories, first one first. A move answers with it alone, from stored
 * data, so that no call to GitHub can fail a move that saved.
 */
export interface RepositoryOrderResponse {
  order: readonly string[]
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The name order of repositories: the lower-case GitHub name, then the
 * exact name, then the ID. GitHub names hold only ASCII characters, so
 * this order matches SQLite `lower` and its binary text order.
 */
export function compareRepositoryNames(
  a: Pick<Repository, 'id' | 'fullName'>,
  b: Pick<Repository, 'id' | 'fullName'>,
): number {
  return (
    compareText(a.fullName.toLowerCase(), b.fullName.toLowerCase()) ||
    compareText(a.fullName, b.fullName) ||
    compareText(a.id, b.id)
  )
}

/**
 * The body of an add or a removal of a repository. With `build: false`, an
 * add starts no build, so that one build at Done holds every add of an
 * edit. A body without `build` starts a build at each add.
 */
export interface RepositoryChangeRequest {
  build?: boolean
}

/** Whether a repository add starts a build: each body but `build: false`. */
export function buildsAtAdd(body: unknown): boolean {
  return !(
    typeof body === 'object' &&
    body !== null &&
    'build' in body &&
    body.build === false
  )
}
export interface RepositoriesResponse {
  repositories: readonly Repository[]
}

export interface OrgSettings {
  /** Software included before the install script. Older replies may omit it. */
  baseImage?: BaseImage
  installScript: string
  startupScript: string
  /** Older replies may omit the skills repository. */
  skillsRepository?: string
  /** An absent name means untrusted, also in older replies. */
  trustedSkillsRepository?: string
  /** A stored value never goes back to the browser. */
  envVars: readonly { name: string; secret: boolean }[]
  updatedAt: Timestamp
}
export interface OrgSettingsResponse {
  settings: OrgSettings
}
export interface UpdateOrgSettingsRequest {
  installScript?: string
  startupScript?: string
  skillsRepository?: string
  trustedSkillsRepository?: string
  envVars?: readonly (
    | { operation: 'set'; name: string; value: string; secret?: boolean }
    | { operation: 'classify'; name: string; secret: boolean }
    | { operation: 'remove'; name: string }
  )[]
}

type SkillsRepositoryNotice =
  'private' | 'not-found' | 'no-skills' | 'incomplete' | 'failed'

export interface SkillsRepositoryLookupResponse {
  repository: string
  skills: readonly string[]
  notice: SkillsRepositoryNotice | null
  clashes: readonly SkillFolderClash[]
}

export interface ImageBuild {
  id: string
  orgId: string
  kind: 'build' | 'refresh'
  state: 'running' | 'succeeded' | 'failed'
  startedAt: Timestamp
  completedAt: Timestamp | null
  durationMs: number | null
  error: string | null
  /**
   * The size and the free space in bytes of the disk that a good build
   * leaves for each new cloud computer. Null while the build runs, after a
   * failure, when the measurement failed, for a build of another provider
   * account, and from an older Worker, which leaves them out.
   */
  storageTotalBytes: number | null
  storageFreeBytes: number | null
  /**
   * True on a running refresh during which an admin asked for a build,
   * with Build computer, Try again, or Done after an add. The build starts
   * when the refresh ends. Older Workers leave it out.
   */
  buildRequested?: boolean
}
export interface BuildLogEvent {
  eventNumber: number
  occurredAt: Timestamp
  text: string
}
export interface BuildsResponse {
  builds: readonly ImageBuild[]
  currentImageBuildId: string | null
  changes: {
    installScript: boolean
    addedRepositories: readonly { id: string; fullName: string }[]
    removedRepositories: readonly { id: string; fullName: string }[]
  }
}
export interface BuildResponse {
  build: ImageBuild
  log: readonly BuildLogEvent[]
}
