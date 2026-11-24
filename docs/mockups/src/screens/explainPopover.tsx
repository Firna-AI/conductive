import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { RotateCcw } from 'lucide-react'
import { nameLabel } from '../../../../src/shared/name-label'
import { ChatPane } from '../components/chat/ChatPane'
import { Menu } from '../../../../src/ui/components/common/Menu'
import { Notice } from '../../../../src/ui/components/common/Notice'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import {
  askLabel,
  askPlaceholder,
  markMenuTitle,
  reopenBody,
  reopenTitle,
} from '../../../../src/ui/components/explain/explainCopy'
import { ExplainPopover } from '../components/explain/ExplainPopover'
import { FollowUpField } from '../components/explain/FollowUpField'
import { replacesComposer } from '../../../../src/ui/components/workspace/sandboxNoticeState'
import { explanationChatsOf, promptId } from '../fixtures/explanationChats'
import { askQuestion, explanations } from '../fixtures/explanations'
import { overlapEntries } from './explainMarks'
import {
  askedSession,
  explainRuns,
  followedExplanation,
  parentPage,
  parentShows,
  startedWithAsk,
} from './explainModel'
import { explainPaths } from './explainPaths'
import { viewerOf } from './sessionStarter'
import { startingLogFor } from './workspaceParts'
import { sandboxNotice } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * The chat of the explanation of Cal in its popover. It leaves out the
 * written prompt, which still starts the first turn, so the work of that
 * turn folds. While the sandbox starts, the prompt waits in the queue, and
 * the steps of the start show in its place. The follow-up field has Stop
 * while a turn runs. While the sandbox does not run, the bar of a tab, such
 * as the bar with Resume, takes the place of the field, as it takes the
 * place of the composer. A closed explanation shows its chat, and the
 * notice over the field says that a follow-up reopens it, as Expand does.
 * That notice goes with the field. A read-only workspace shows the chat to
 * read, with no field and no bar.
 */
function popoverChat(
  state: WorkspaceState,
  viewport: Viewport,
  readOnly: boolean,
): ReactNode {
  const session = askedSession(state)
  const starting = state.sandbox === 'starting'
  const problem = readOnly ? undefined : sandboxNotice(state)
  const down = problem !== undefined && replacesComposer(problem)
  const reopens =
    session === 'closed' && !readOnly && !down ? (
      <Notice body={reopenBody} icon={RotateCcw} title={reopenTitle} />
    ) : undefined
  const field = readOnly ? null : (
    <FollowUpField running={!starting && explainRuns(session)} />
  )
  const chats = explanationChatsOf(followedExplanation(state))
  return (
    <ChatPane
      compact
      field={field}
      hide={promptId}
      items={starting ? [chats.queued] : chats.stages[session]}
      notice={reopens}
      problem={problem}
      starting={startingLogFor(state)}
      viewer={viewerOf(state)}
      viewport={viewport}
    />
  )
}

/**
 * The tab that Expand shows, where the mockups draw it: the tab after the
 * answer, which opens again at the end of the row when it was closed.
 */
function expandPage(state: WorkspaceState, readOnly: boolean) {
  if (readOnly || state.sandbox !== 'ready') return undefined
  const session = askedSession(state)
  if (session !== 'answered' && session !== 'closed') return undefined
  return startedWithAsk(state) ? explainPaths.askTab : explainPaths.tab
}

/**
 * The popover of an Ask before Send, by the line that keeps its highlight.
 * Its header shows the quote and the close button. No session exists yet,
 * so it leaves out Expand, its chat is empty, and the close button starts
 * nothing. The field of the question has the focus, and Send is off while
 * it is empty. A phone shows it as the sheet at half height.
 */
function unsentAsk(state: WorkspaceState, viewport: Viewport): ReactNode {
  const typed = state.explainOpen === 'ask-typed'
  const field = (
    <FollowUpField
      draft={typed ? askQuestion : ''}
      focused
      placeholder={askPlaceholder}
      running={false}
      sendTo={typed ? explainPaths.askSent : undefined}
    />
  )
  return (
    <ExplainPopover
      quote={explanations.question.text}
      title={askLabel}
      unsent
      viewport={viewport}
    >
      <ChatPane
        compact
        field={field}
        items={[]}
        viewer={viewerOf(state)}
        viewport={viewport}
      />
    </ExplainPopover>
  )
}

/**
 * The height of the sheet on a phone: half, or full when the member drags
 * it up. A request that waits for the member opens the sheet at full
 * height, so its card and the chat above it both have room.
 */
function sheetHeight(state: WorkspaceState): 'half' | 'full' {
  if (state.explainOpen === 'popover-full') return 'full'
  return askedSession(state) === 'waiting' ? 'full' : 'half'
}

/**
 * What Explain lays over the workspace: the popover of the explanation of
 * Cal, by its mark on a computer and as a sheet on a phone, and on a phone
 * the sheet of the menu of overlapping marks. A computer draws that menu by
 * the text. Before Send, an Ask lays its popover by the text that it keeps.
 * A read-only workspace shows no Ask.
 */
export function explainOverlay(
  state: WorkspaceState,
  viewport: Viewport,
  readOnly: boolean,
): ReactNode {
  if (!parentShows(state)) return null
  switch (state.explainOpen) {
    case 'popover':
    case 'popover-full': {
      const explanation = followedExplanation(state)
      return (
        <ExplainPopover
          closeTo={parentPage(state)}
          expandTo={expandPage(state, readOnly)}
          height={sheetHeight(state)}
          quote={explanation.text}
          title={nameLabel(explanation.title)}
          viewport={viewport}
        >
          {popoverChat(state, viewport, readOnly)}
        </ExplainPopover>
      )
    }
    case 'ask':
    case 'ask-typed':
      return readOnly ? null : unsentAsk(state, viewport)
    case 'menu':
      return viewport === 'mobile' ? (
        <Sheet title={markMenuTitle}>
          <Menu
            entries={overlapEntries(state)}
            label={markMenuTitle}
            placement="sheet"
          />
        </Sheet>
      ) : null
    case 'none':
    case 'select':
    case 'select-message':
      return null
  }
}
