import type { GitHubSummary } from '../../../../../../src/shared/generated/GitHubSummary'
import type { RowIndent } from '../../../components/workspaces/trees'
import type { Role } from '../../../fixtures/members'
import { agentKeys, type EffortKey } from '../../../fixtures/agents'
import type { RepositoryKey } from '../../../fixtures/repositories'
import { sectionKeys } from '../../../fixtures/sections'
import type { ActivityStatus } from '../../../../../../src/ui/components/workspaces/activityStatus'
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

/** The steps of the indent of a nested row, as `RowIndent` lists them. */
const rowIndents = [0, 1, 2, 3] as const satisfies readonly RowIndent[]

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
    /** The branch before the workspace has a name, when it differs. */
    placeholderBranch: { type: 'string' },
    repository: { enum: repositoryKeys },
    section: { enum: sectionKeys },
    choice: agentChoiceSchema,
    status: { enum: activityStatuses },
    /** Whether a message waits for the cloud computer to start. */
    messageWaiting: { type: 'boolean' },
    github: githubSchema,
    /** The time since the last activity, such as `2h`. */
    updated: { type: 'string' },
    owner: { enum: personKeys },
    baseBranch: { type: 'string' },
    /** The stored base that GitHub deleted, which the default replaced. */
    movedBase: { type: 'string' },
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
    /** The steps of its indent under the rows of its tree. Without it, 0. */
    indent: { enum: rowIndents },
    /** The guide lines of the row in its tree, as `TreeLines`. */
    lines: {
      type: 'object',
      additionalProperties: false,
      required: ['last', 'through', 'hasNested'],
      properties: {
        /** The last row that the list shows under its parent. */
        last: { type: 'boolean' },
        /** Whether the line of each outer column runs on through the row. */
        through: { type: 'array', items: { type: 'boolean' } },
        /** The list shows rows under the row. */
        hasNested: { type: 'boolean' },
      },
    },
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
