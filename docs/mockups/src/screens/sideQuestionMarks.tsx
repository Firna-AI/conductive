import type { ReactNode } from 'react'
import { nameLabel } from '../../../../src/shared/name-label'
import { Menu, type MenuEntry } from '../components/common/Menu'
import {
  AskButton,
  AskPrompt,
  PhoneAskButton,
} from '../components/side-questions/AskAbout'
import { MarkGlyph } from '../components/side-questions/MarkGlyph'
import { markMenuTitle } from '../components/side-questions/sideQuestionCopy'
import type {
  MessageMarks,
  TextMark,
  TextSpan,
} from '../components/side-questions/chatMarks'
import {
  selectedInMessage,
  sideQuestions,
  type QuotedMessage,
} from '../fixtures/sideQuestions'
import {
  askedSession,
  markedQuestions,
  markState,
  parentShows,
  sideReadOnly,
  type MarkedQuestion,
} from './sideQuestionModel'
import { sideQuestionPaths } from './sideQuestionPaths'
import type { WorkspaceState } from './workspaceState'

const { count } = sideQuestions

/** The page of the overlay of the side session of Cal, in its state. */
export function overlayPageOf(state: WorkspaceState): string {
  if (sideReadOnly(state)) return sideQuestionPaths.readOnlyOverlay
  switch (askedSession(state)) {
    case 'running':
      return sideQuestionPaths.overlayRunning
    case 'waiting':
      return sideQuestionPaths.overlayWaiting
    case 'idle':
      return sideQuestionPaths.overlay
    case 'closed':
      return sideQuestionPaths.overlayClosed
  }
}

/**
 * The mark of a side question. A press opens the overlay of its session,
 * which the mockups draw for the session of Cal, and its mark stays
 * deeper while that overlay is open.
 */
function textMark(state: WorkspaceState, marked: MarkedQuestion): TextMark {
  const asked = marked.question === count
  return {
    key: marked.question.key,
    title: nameLabel(marked.question.title),
    state: markState(marked.session),
    to: asked ? overlayPageOf(state) : undefined,
    active: asked && state.sideOpen === 'overlay',
  }
}

/**
 * The rows of the menu of overlapping marks: the state and the title of
 * each side session, in the order that they were asked. A press on a row
 * opens the overlay of its session.
 */
export function overlapEntries(state: WorkspaceState): MenuEntry[] {
  return markedQuestions(state).map((marked) => {
    const mark = textMark(state, marked)
    return {
      kind: 'item',
      label: mark.title,
      mark: <MarkGlyph state={mark.state} />,
    }
  })
}

/**
 * The selection of the state, and what a computer shows by it: Ask about
 * this, or the prompt field that it opens. A read-only workspace shows no
 * button. A phone shows its own selection menu and handles, until the
 * prompt opens in a sheet.
 */
function selectionOf(
  state: WorkspaceState,
): { message: QuotedMessage; span: TextSpan } | undefined {
  const readOnly = sideReadOnly(state)
  switch (state.sideOpen) {
    case 'select': {
      const to = sideQuestionPaths.prompt
      const by = readOnly ? undefined : <AskButton align="start" to={to} />
      return {
        message: count.message,
        span: { kind: 'selection', quote: count.quote, by, system: true },
      }
    }
    case 'select-message': {
      const by = readOnly ? undefined : <AskButton align="end" />
      return {
        message: 'ask',
        span: { kind: 'selection', quote: selectedInMessage, by, system: true },
      }
    }
    case 'prompt': {
      if (readOnly) return undefined
      const by = (
        <AskPrompt
          align="start"
          cancelTo={sideQuestionPaths.select}
          draft={count.prompt}
          sendTo={sideQuestionPaths.overlayRunning}
        />
      )
      return {
        message: count.message,
        span: { kind: 'selection', quote: count.quote, by, system: false },
      }
    }
    case 'none':
    case 'menu':
    case 'overlay':
      return undefined
  }
}

/**
 * The marks and the selection of each message of the chat of the first
 * session. A mark whose text no longer matches covers its whole message.
 * Where marks overlap, a press opens their menu, which a computer draws
 * under them.
 */
export function chatMarksOf(
  state: WorkspaceState,
): Readonly<Record<string, MessageMarks>> {
  if (!parentShows(state)) return {}
  const marked = markedQuestions(state)
  const spans: Record<QuotedMessage, TextSpan[]> = { ask: [], done: [] }
  const stale = state.sideMarks === 'stale' ? marked.at(0) : undefined
  if (stale === undefined) {
    for (const each of marked) {
      const { message, quote } = each.question
      spans[message].push({ kind: 'mark', quote, mark: textMark(state, each) })
    }
  }
  const selection = selectionOf(state)
  if (selection) spans[selection.message].push(selection.span)
  const menuOpen = state.sideOpen === 'menu'
  const overlap =
    state.sideMarks === 'overlap'
      ? {
          to: menuOpen ? undefined : sideQuestionPaths.menu,
          menu: menuOpen ? (
            <Menu
              entries={overlapEntries(state)}
              label={markMenuTitle}
              placement="below-start"
              wide
            />
          ) : undefined,
        }
      : undefined
  return {
    ask: { spans: spans.ask },
    done: {
      spans: spans.done,
      whole: stale ? textMark(state, stale) : undefined,
      overlap,
    },
  }
}

/**
 * Ask about this on a phone, above the composer, while text of the chat of
 * the first session is selected in a workspace that can send.
 */
export function sideAskNotice(state: WorkspaceState): ReactNode {
  if (!parentShows(state) || sideReadOnly(state)) return undefined
  if (state.sideOpen === 'select') {
    return <PhoneAskButton to={sideQuestionPaths.prompt} />
  }
  if (state.sideOpen === 'select-message') return <PhoneAskButton />
  return undefined
}
