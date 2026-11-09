import type { SchemaProps } from '@mokly/mokly'
import { fileLists, treeStates } from '../components/files/FilesPanel'
import { paletteViews } from '../components/palette/paletteViews'
import { toolKeys } from '../components/workspace/tools'
import { conversationKeys } from '../fixtures/conversations'
import { pathStates } from '../fixtures/maskedFiles'
import { bannerStates } from '../fixtures/pullRequests'
import { startErrorKeys } from '../fixtures/starting'
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
    'name',
    'sandbox',
    'startError',
    'conversation',
    'banner',
    'files',
    'tool',
    'ports',
    'focus',
    'tab',
    'composer',
    'resize',
    'rightColumn',
    'overlay',
    'viewer',
    'lostUpdate',
    'tree',
    'paths',
    'org',
    'palette',
    'copyLink',
  ],
  properties: {
    workspace: { enum: openableWorkspaces },
    /**
     * The name of a new workspace: its title, or no name yet, which shows
     * as Untitled. A new workspace has no name from the send until the
     * title comes, about a second later. So a start that shows Untitled
     * shows only its first step. Any other workspace shows its own name.
     */
    name: { enum: ['title', 'untitled'] },
    /**
     * The cloud computer. An archived workspace has none. `refused` is a
     * stopped cloud computer whose start the app refuses, such as while the
     * owner of the workspace is suspended.
     */
    sandbox: {
      enum: ['ready', 'starting', 'stopped', 'error', 'refused', 'archived'],
    },
    /**
     * The message that the app saved for a start that failed, which the
     * error state shows: a failure, or the 20-minute limit of a start.
     */
    startError: { enum: startErrorKeys },
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
     * The tab of the centre column: the first session, a new session, the
     * linked session that a member's message opened from the first session,
     * or a file, a Markdown preview, a diff, or a file whose name the app
     * does not know, such as a file that moved. A phone shows a file in
     * Files.
     */
    tab: {
      enum: [
        'session',
        'new-session',
        'linked-session',
        'code',
        'markdown',
        'diff',
        'unnamed-file',
      ],
    },
    /**
     * The composer: empty, with a message that is not sent yet, with
     * attached files, with its picker open, or with a message for an agent
     * that is not connected. Or with a message in a session whose starter's
     * login is not available, or whose starter keeps that login for their
     * own messages. `workspace-link` holds a message with a pasted link to
     * another workspace of the org, which shows as a chip.
     */
    composer: {
      enum: [
        'empty',
        'draft',
        'attachments',
        'picker',
        'no-agent',
        'no-starter-login',
        'not-shared',
        'workspace-link',
      ],
    },
    /** The user drags the handle of the right column to widen it. */
    resize: { enum: ['none', 'right'] },
    /**
     * The right column of the desktop: shown, or hidden with the toggle at
     * the end of the header. A phone has no right column.
     */
    rightColumn: { enum: ['shown', 'hidden'] },
    /**
     * What lies open over the workspace: the session history, the question
     * before a running session closes, the owner of the workspace, or the
     * question of Archive, with work that is not pushed or with none.
     */
    overlay: {
      enum: [
        'none',
        'history',
        'close-session',
        'reassign',
        'archive-unpushed',
        'archive-pushed',
      ],
    },
    /** The person signed in: an admin of the org, or a member who is not. */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The notices of data without a session (decision 96). After a lost
     * update the workspace asks for a fresh full report, and nothing shows.
     * `failed-repair` draws the notices that show when that report is lost
     * too: a file list's under the file lists, and the workspace name's
     * under the header.
     */
    lostUpdate: { enum: ['none', 'failed-repair'] },
    /**
     * The list of All files: the latest one, or the cloud computer could not
     * read the files. Then All files keeps the list that it saved before,
     * under a notice, or says that the list is unavailable when it saved
     * none. The next complete list returns to `latest`.
     */
    tree: { enum: treeStates },
    /**
     * The paths of the files: plain, or two paths that hold the secret value
     * of an org env var. Each list, tab, and page then shows "[redacted]" in
     * place of the value, and a diff opens the masked seed script.
     */
    paths: { enum: pathStates },
    /**
     * The org of the workspace: in use, or suspended by the operator. In a
     * suspended org every start is refused, so the screen draws a sandbox
     * that is not archived as `refused`, with the words of the org's
     * refusal, and nothing in the workspace can change.
     */
    org: { enum: ['active', 'suspended'] },
    /**
     * The command palette, closed or open on one of its views. Over an
     * open workspace it offers the actions of the workspace first. A phone
     * opens it from the list, so a phone shows the palette of the list.
     */
    palette: { enum: paletteViews },
    /**
     * The label of the workspace number in the header, which copies the
     * link of the workspace: as it is, or just after a press, while it
     * shows for a moment that the copy worked or failed.
     */
    copyLink: { enum: ['none', 'copied', 'failed'] },
  },
} as const

export type WorkspaceState = SchemaProps<typeof workspaceStateSchema>

/** The ready workspace of the canonical screen. Entries change from here. */
export const readyWorkspace: WorkspaceState = {
  workspace: 'checkout-autocomplete',
  name: 'title',
  sandbox: 'ready',
  startError: 'failed',
  conversation: 'history',
  banner: 'ready-to-merge',
  files: 'changes',
  tool: 'terminal',
  ports: 'open',
  focus: 'chat',
  tab: 'session',
  composer: 'empty',
  resize: 'none',
  rightColumn: 'shown',
  overlay: 'none',
  viewer: 'admin',
  lostUpdate: 'none',
  tree: 'latest',
  paths: 'plain',
  org: 'active',
  palette: 'closed',
  copyLink: 'none',
}

/**
 * The workspace of the banner screens: the right column and a phone both
 * show the Checks tab under the pull request bar.
 */
export const checksWorkspace: WorkspaceState = {
  ...readyWorkspace,
  files: 'checks',
  tool: 'preview',
  focus: 'files',
}
