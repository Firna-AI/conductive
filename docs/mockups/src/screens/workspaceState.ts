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
    'tool',
    'files',
    'ports',
    'focus',
  ],
  properties: {
    workspace: { enum: openableWorkspaces },
    sandbox: { enum: ['ready', 'starting', 'stopped', 'error'] },
    conversation: { enum: conversationKeys },
    banner: { enum: bannerStates },
    /** The tool that the desktop panel and the mobile tool tab show. */
    tool: { enum: toolKeys },
    files: { enum: fileViews },
    ports: { enum: ['open', 'none'] },
    /** What the mobile layout shows: the chat, or the tool. */
    focus: { enum: ['chat', 'tool'] },
  },
} as const

export type WorkspaceState = SchemaProps<typeof workspaceStateSchema>

/** The ready workspace of the canonical screen. Entries change from here. */
export const readyWorkspace: WorkspaceState = {
  workspace: 'checkout-autocomplete',
  sandbox: 'ready',
  conversation: 'history',
  banner: 'ready-to-merge',
  tool: 'files',
  files: 'changes',
  ports: 'open',
  focus: 'chat',
}
