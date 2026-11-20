import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { chatPane } from '../entries/components/chat/ChatPane.mockup'
import { composerData } from '../entries/components/chat/capabilitiesSlot'
import { ChatWorkspaces, type ChatRow } from '../components/chat/chatWorkspaces'
import { emptyState } from '../entries/components/common/EmptyState.mockup'
import type { PictureRead } from '../components/chat/chatPictures'
import type { ComposerState } from '../components/chat/Composer'
import type { FoldState } from '../components/chat/WorkFold'
import type { BarNotice } from '../components/workspace/SandboxNotice'
import { defined, plainData } from '../defined'
import type { ChatItem } from '../fixtures/conversations'
import type { PersonKey } from '../fixtures/members'
import type { StartingLog } from '../fixtures/starting'
import type { Workspace } from '../fixtures/workspaces'

/**
 * The parts of the chat of an open workspace, as the workspace screen
 * works them out from its state.
 */
type WorkspaceChatParts = {
  /** The workspaces of the screen, which the chips of the chat find. */
  rows: readonly ChatRow[]
  workspace: Workspace
  items: readonly ChatItem[]
  composer: ComposerState
  /** A message above the composer, such as a notice of the org. */
  notice: ReactNode
  problem: BarNotice | undefined
  /** The reads of the pictures of the answers, while the computer runs. */
  pictures: PictureRead | undefined
  starting: StartingLog | undefined
  fold: FoldState
  viewer: PersonKey
  viewport: Viewport
}

/**
 * The chat of an open workspace: the transcript and the composer, with the
 * workspaces of the screen for its chips. A new session shows its empty
 * state in place of the transcript. The screen imports this module where
 * it imported the chat before, so the styles of the chat load first.
 */
export function workspaceChat(parts: WorkspaceChatParts): ReactNode {
  // The open Capabilities control and a picker in place of the model
  // picker are not data, so they go in slots.
  const box = composerData(parts.composer)
  return (
    <ChatWorkspaces rows={parts.rows}>
      <chatPane.Component
        composer={plainData(box.composer)}
        empty={
          <emptyState.Component
            body={`The agent works on ${parts.workspace.branch}, on the same cloud computer as the other sessions.`}
            icon="message-square-plus"
            moklyInstance="new-session-empty"
            title="New session"
          />
        }
        fold={parts.fold}
        items={plainData(parts.items)}
        moklyInstance="chat"
        viewer={parts.viewer}
        viewport={parts.viewport}
        {...defined({
          capabilitiesPanel: box.capabilitiesPanel,
          pickerPart: box.pickerPart,
          notice: parts.notice,
          pictures: parts.pictures,
          problem: parts.problem && plainData(parts.problem),
          starting: parts.starting && plainData(parts.starting),
        })}
      />
    </ChatWorkspaces>
  )
}
