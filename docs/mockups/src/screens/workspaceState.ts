import type { SchemaProps } from '@mokly/mokly'
import { fileViews } from '../components/files/FilesPanel'
import { toolKeys } from '../components/workspace/tools'
import { conversationKeys } from '../fixtures/conversations'
import { bannerStates } from '../fixtures/pullRequests'
import { openableWorkspaces } from '../fixtures/workspaces'

/**
 * The state of the workspace screen. Each catalogue entry of the screen is a
 * set of these props, and Mokly's serve controls can change each one.
 */
export const workspaceStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workspace',
    'sandbox',
    'conversation',
    'banner',
    'files',
    'tool',
    'ports',
    'focus',
  ],
  properties: {
    workspace: { enum: openableWorkspaces },
    sandbox: { enum: ['ready', 'starting', 'stopped', 'error'] },
    conversation: { enum: conversationKeys },
    banner: { enum: bannerStates },
    /** The files panel: a list, the checks, or a preview of one file. */
    files: { enum: fileViews },
    /** The tool of the tools panel. */
    tool: { enum: toolKeys },
    ports: { enum: ['open', 'none'] },
    /** What a phone shows: the chat, the files, or the tool. */
    focus: { enum: ['chat', 'files', 'tool'] },
  },
} as const

export type WorkspaceState = SchemaProps<typeof workspaceStateSchema>

/** The ready workspace of the canonical screen. Entries change from here. */
export const readyWorkspace: WorkspaceState = {
  workspace: 'checkout-autocomplete',
  sandbox: 'ready',
  conversation: 'history',
  banner: 'ready-to-merge',
  files: 'changes',
  tool: 'terminal',
  ports: 'open',
  focus: 'chat',
}
