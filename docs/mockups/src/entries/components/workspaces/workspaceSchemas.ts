import type { GitHubSummary } from '../../../../../../src/shared/generated/GitHubSummary'
import type { Role } from '../../../fixtures/members'
import { agentKeys, type EffortKey } from '../../../fixtures/agents'
import type { RepositoryKey } from '../../../fixtures/repositories'
import { sectionKeys } from '../../../fixtures/sections'
import type { ActivityStatus } from '../../../fixtures/workspaces'
import { personKeys } from '../layout/railSchemas'

/**
 * The GitHub states of a pull request that the mark shows in colour. A
 * state that a screen passes and this list leaves out fails the build.
 */
const githubStates = [
  'checks-running',
  'checks-failed',
  'ready-to-merge',
  'merged',
  'conflict',
  'changes-requested',
  'draft',
  'blocked',
] as const satisfies readonly GitHubSummary[]

/** The states of a workspace, as `ActivityStatus` lists them. */
export const activityStatuses = [
  'working',
  'input',
  'unread',
  'ready',
  'starting',
  'stopped',
  'error',
  'archived',
] as const satisfies readonly ActivityStatus[]

/** The GitHub state of a pull request, or `null` without one. */
export const githubSchema = { enum: [...githubStates, null] } as const

/** The repositories of Acme, as `RepositoryKey` lists them. */
const repositoryKeys = [
  'storefront',
  'billing-service',
  'marketing-site',
] as const satisfies readonly RepositoryKey[]

/** The effort levels of the models, as `EffortKey` lists them. */
const effortKeys = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'ultra',
] as const satisfies readonly EffortKey[]

/** The agent, the model, the effort, and the speed, as `AgentChoice`. */
export const agentChoiceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'model', 'effort'],
  properties: {
    agent: { enum: agentKeys },
    model: { type: 'string' },
    effort: { enum: effortKeys },
    fast: { type: 'boolean' },
  },
} as const

/** A workspace of the fixtures as JSON, with the fields of `Workspace`. */
export const workspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'key',
    'name',
    'number',
    'link',
    'branch',
    'repository',
    'section',
    'choice',
    'status',
    'github',
    'updated',
    'owner',
  ],
  properties: {
    key: { type: 'string' },
    name: { type: 'string' },
    number: { type: 'integer', minimum: 1 },
    link: { type: 'string' },
    branch: { type: 'string' },
    repository: { enum: repositoryKeys },
    section: { enum: sectionKeys },
    choice: agentChoiceSchema,
    status: { enum: activityStatuses },
    github: githubSchema,
    /** The time since the last activity, such as `2h`. */
    updated: { type: 'string' },
    owner: { enum: personKeys },
    baseBranch: { type: 'string' },
  },
} as const

/** A row of the workspace list as JSON, with the fields of `WorkspaceRow`. */
export const workspaceRowSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace', 'status', 'github', 'selected'],
  properties: {
    workspace: workspaceSchema,
    status: { enum: activityStatuses },
    github: githubSchema,
    selected: { type: 'boolean' },
    /** The screen that opening the workspace shows, when one is drawn. */
    to: { type: 'string', minLength: 1 },
    /** The row of an archived workspace offers Restore. */
    restoreOpen: { type: 'boolean' },
  },
} as const

/** A section of the list as JSON, with the fields of `Section`. */
const sectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'name', 'collapsed'],
  properties: {
    key: { enum: sectionKeys },
    name: { type: 'string' },
    collapsed: { type: 'boolean' },
  },
} as const

/** A section with its rows, as `SidebarSection`. */
export const sidebarSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['section', 'rows'],
  properties: {
    section: sectionSchema,
    rows: { type: 'array', items: workspaceRowSchema },
  },
} as const

/** The roles of an org, as `Role` lists them. */
const roles = ['admin', 'member'] as const satisfies readonly Role[]

/** The person who looks at a list and their role, as `Membership`. */
export const membershipSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['person', 'role'],
  properties: { person: { enum: personKeys }, role: { enum: roles } },
} as const
