import type { AccountResponse } from '../../shared/account'
import type { BoatKeyStatus, User } from '../../shared/api'
import type { MembersResponse } from '../../shared/members'
import type { Attachment } from '../../shared/messages'
import type {
  GetStartedResponse,
  GetStartedStep,
} from '../../shared/onboarding'
import type {
  BuildResponse,
  OrgSettings,
  Repository,
} from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Section } from '../../shared/sections'
import type { Workspace, WorkspaceResponse } from '../../shared/workspaces'
import { coreFixtures } from '../../test-support/fixtures/core'

/** The start steps and the start error of one workspace. */
export type StartRecord = Pick<WorkspaceResponse, 'start' | 'error'>

/** One org of the user, as the dev fake keeps it in memory. */
export interface OrgState {
  org: OrgSummary
  /** In the order of their positions, which count from 0. */
  sections: readonly Section[]
  /** In the order of the workspace list. */
  workspaces: readonly Workspace[]
  starts: Map<string, StartRecord>
  /** The workspaces that the fake made. The recorded server has no replies for them. */
  created: Set<string>
  /** The cancel of each start that runs, by workspace ID. */
  running: Map<string, () => void>
  repositories: readonly Repository[]
  settings: OrgSettings
  /** Each build with its log, the newest first. */
  builds: readonly BuildResponse[]
  currentImageBuildId: string | null
  boatKey: BoatKeyStatus
  members: MembersResponse
}

/** Everything that the writes of the dev fake change. */
export interface DevState {
  account: AccountResponse
  getStarted: GetStartedResponse
  /** In the order of the org rail. */
  orgs: readonly OrgState[]
  /** `false` until the user installs the GitHub App. */
  githubAppInstalled: boolean
  /** The uploads of New workspace, by ID. */
  attachments: Map<string, Attachment>
  /** The wait before an open workspace stops, from `stop=<seconds>`. */
  stopAfterMs: number | null
}

/**
 * A new org: the default section, no workspaces, the repositories that the
 * GitHub App reaches with none chosen, empty scripts, no builds, no Boat
 * key, and the user as its only member.
 */
export function freshOrg(org: OrgSummary, user: User, now: number): OrgState {
  const { sectionList, repositories } = coreFixtures()
  const general =
    sectionList.sections.find((section) => section.isDefault) ??
    sectionList.sections[0]
  return {
    org,
    sections: [{ ...general, orgId: org.id, position: 0, collapsed: false }],
    workspaces: [],
    starts: new Map(),
    created: new Set(),
    running: new Map(),
    repositories: repositories.repositories.map((repository) => ({
      ...repository,
      orgId: org.id,
      selected: false,
    })),
    settings: {
      installScript: '',
      startupScript: '',
      envVars: [],
      updatedAt: now,
      needsBuild: false,
    },
    builds: [],
    currentImageBuildId: null,
    boatKey: { configured: false },
    members: {
      members: [{ user, role: org.role, joinedAt: now }],
      invites: [],
    },
  }
}

/** Marks a step of Get started as done. */
export function completeStep(state: DevState, step: GetStartedStep): void {
  state.getStarted = {
    ...state.getStarted,
    steps: state.getStarted.steps.map((item) =>
      item.step === step ? { step, complete: true } : item,
    ),
  }
}

/** A readable ID from a name, such as `acme-labs` for "Acme Labs". */
export function slugify(name: string, fallback: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug === '' ? fallback : slug
}

/** `base`, or `base-2`, `base-3`, and so on when another item has the ID. */
export function uniqueId(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base
  let number = 2
  while (taken.includes(`${base}-${number}`)) number += 1
  return `${base}-${number}`
}
