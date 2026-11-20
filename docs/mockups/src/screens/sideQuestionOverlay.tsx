import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { RotateCcw } from 'lucide-react'
import { nameLabel } from '../../../../src/shared/name-label'
import { ChatPane } from '../components/chat/ChatPane'
import type { ComposerState } from '../components/chat/Composer'
import { Menu } from '../components/common/Menu'
import { Notice } from '../components/common/Notice'
import { Sheet } from '../components/common/Sheet'
import { AskPromptSheet } from '../components/side-questions/AskAbout'
import {
  markMenuTitle,
  reopenBody,
  reopenTitle,
} from '../components/side-questions/sideQuestionCopy'
import { SideSessionOverlay } from '../components/side-questions/SideSessionOverlay'
import { countChats, sideQuestions } from '../fixtures/sideQuestions'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { viewerOf } from './sessionStarter'
import { overlapEntries } from './sideQuestionMarks'
import {
  askedSession,
  parentPage,
  parentShows,
  sideRuns,
  type SideSessionState,
} from './sideQuestionModel'
import { sideQuestionPaths } from './sideQuestionPaths'
import { sandboxNotice } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

const { count } = sideQuestions

/**
 * The composer of the side session, as its tab has it: the model of the
 * member who asked, Stop while its turn runs, and a message that steers
 * the turn.
 */
function sideComposer(
  workspace: Workspace,
  session: SideSessionState,
): ComposerState {
  const { choice } = workspace
  return {
    choice,
    running: sideRuns(session),
    draft: '',
    attachments: [],
    sessionAgent: choice.agent,
    capabilities: { to: paths.capabilities },
    menu: { open: false, to: paths.capabilitiesMenu },
  }
}

/**
 * The overlay of the side session of Cal, over the parent chat: its chat,
 * its composer with Stop, and Open as tab. A closed session shows its chat
 * to read, and the notice over the composer says that a send reopens it,
 * as Open as tab does. A read-only workspace shows the bar of the sandbox
 * in place of the composer, as its chat does.
 */
function askedOverlay(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
  readOnly: boolean,
): ReactNode {
  const session = askedSession(state)
  const closed = session === 'closed'
  const reopens =
    closed && !readOnly ? (
      <Notice body={reopenBody} icon={RotateCcw} title={reopenTitle} />
    ) : undefined
  return (
    <SideSessionOverlay
      closeTo={parentPage(state)}
      openTo={
        session === 'idle' && !readOnly ? sideQuestionPaths.tab : undefined
      }
      running={sideRuns(session)}
      title={nameLabel(count.title)}
      viewport={viewport}
    >
      <ChatPane
        composer={sideComposer(workspace, session)}
        items={countChats[closed ? 'idle' : session]}
        notice={reopens}
        problem={sandboxNotice(state)}
        viewer={viewerOf(state)}
        viewport={viewport}
      />
    </SideSessionOverlay>
  )
}

/**
 * What side questions lay over the workspace: the overlay of the side
 * session of Cal, and on a phone the sheet of the prompt field or of the
 * menu of overlapping marks. A computer draws the prompt field and the
 * menu by the text, so only the overlay lies over its app.
 */
export function sideOverlay(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
  readOnly: boolean,
): ReactNode {
  if (!parentShows(state)) return null
  const phone = viewport === 'mobile'
  switch (state.sideOpen) {
    case 'overlay':
      return askedOverlay(state, workspace, viewport, readOnly)
    case 'menu':
      return phone ? (
        <Sheet title={markMenuTitle}>
          <Menu
            entries={overlapEntries(state)}
            label={markMenuTitle}
            placement="sheet"
          />
        </Sheet>
      ) : null
    case 'prompt':
      return phone && !readOnly ? (
        <AskPromptSheet
          cancelTo={sideQuestionPaths.select}
          draft={count.prompt}
          quote={count.quote}
          sendTo={sideQuestionPaths.overlayRunning}
        />
      ) : null
    case 'none':
    case 'select':
    case 'select-message':
      return null
  }
}
