import type { SchemaProps } from '@mokly/mokly'
import { firstBuildStates } from '../fixtures/computer'
import { branchRefusals } from './newWorkspaceBranches'
import { newWorkspaceFormProperties } from './newWorkspaceParts'

/**
 * The state of the New workspace page: the shared fields of the form, the
 * result of a create, the org, its first build, the viewer, and the menu
 * of the model picker.
 */
export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'draft',
    'files',
    'login',
    'repositories',
    'repositoryMenu',
    'branch',
    'target',
    'branchMenu',
    'waitingBuild',
    'capabilities',
    'result',
    'org',
    'firstBuild',
    'viewer',
    'modelMenu',
  ],
  properties: {
    ...newWorkspaceFormProperties,
    /**
     * A form, a failed create request, or a create that the branch check
     * refused. Each keeps the draft.
     */
    result: { enum: ['form', 'error', ...branchRefusals] },
    /** Acme in use or suspended, or Firna before its first workspace. */
    org: { enum: ['active', 'suspended', 'new'] },
    /** Firna needs its first good build before a message can go. */
    firstBuild: { enum: firstBuildStates },
    /** Only an admin gets the link to the Cloud computer tab. */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The menu of the model picker: closed, open with fast mode on, or open
     * with the submenu of All models, which a phone shows in place of the
     * menu.
     */
    modelMenu: { enum: ['closed', 'open-fast', 'all-models'] },
  },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

/** The chat of a new workspace in an org in use, with the task written. */
export const newWorkspaceForm: NewWorkspaceState = {
  draft: 'message',
  files: 'none',
  login: 'connected',
  repositories: 'chosen',
  repositoryMenu: 'closed',
  branch: 'default',
  target: 'picked',
  branchMenu: 'closed',
  waitingBuild: 'building',
  capabilities: 'closed',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
  modelMenu: 'closed',
}
