import type { SchemaProps } from '@mokly/mokly'
import { fileLists } from '../components/files/FilesPanel'
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
    'tab',
    'composer',
    'resize',
    'overlay',
  ],
  properties: {
    workspace: { enum: openableWorkspaces },
    sandbox: { enum: ['ready', 'starting', 'stopped', 'error'] },
    conversation: { enum: conversationKeys },
    banner: { enum: bannerStates },
    /** The list of the files panel: All files, Changes, or Checks. */
    files: { enum: fileLists },
    /** The tool of the tools panel. */
    tool: { enum: toolKeys },
    ports: { enum: ['open', 'none'] },
    /** What a phone shows: the chat, the files, or the tool. */
    focus: { enum: ['chat', 'files', 'tool'] },
    /**
     * The tab of the centre column: the first session, a new session, or a
     * file, a Markdown preview, or a diff. A phone shows a file in Files.
     */
    tab: { enum: ['session', 'new-session', 'code', 'markdown', 'diff'] },
    /**
     * The composer: empty, with attached files, with its picker open, or
     * with a message for an agent that is not connected.
     */
    composer: { enum: ['empty', 'attachments', 'picker', 'no-agent'] },
    /** The user drags the handle of the right column to widen it. */
    resize: { enum: ['none', 'right'] },
    /**
     * What lies open over the workspace: the session history, the question
     * before a running session closes, or the owner of the workspace.
     */
    overlay: { enum: ['none', 'history', 'close-session', 'reassign'] },
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
  tab: 'session',
  composer: 'empty',
  resize: 'none',
  overlay: 'none',
}
