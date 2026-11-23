import type { ReactNode } from 'react'
import { nameLabel } from '../../../../src/shared/name-label'
import { Menu, type MenuEntry } from '../../../../src/ui/components/common/Menu'
import type {
  MessageMarks,
  TextMark,
  TextSpan,
} from '../components/explain/chatMarks'
import { markMenuTitle } from '../../../../src/ui/components/explain/explainCopy'
import {
  ExplainButton,
  PhoneExplainButton,
} from '../components/explain/ExplainButton'
import { MarkGlyph } from '../../../../src/ui/components/explain/MarkGlyph'
import {
  explanations,
  selectedInMessage,
  type QuotedMessage,
} from '../fixtures/explanations'
import {
  explainReadOnly,
  markedExplanations,
  markState,
  parentShows,
  popoverOpen,
  popoverPageOf,
  type MarkedExplanation,
} from './explainModel'
import { explainPaths } from './explainPaths'
import type { WorkspaceState } from './workspaceState'

const { count } = explanations

/**
 * The mark of an explanation. A press opens its popover, which the mockups
 * draw for the explanation of Cal. Its mark stays deeper while that popover
 * is open, and the popover keeps to it.
 */
function textMark(state: WorkspaceState, marked: MarkedExplanation): TextMark {
  const asked = marked.explanation === count
  return {
    key: marked.explanation.key,
    title: nameLabel(marked.explanation.title),
    state: markState(marked.session),
    to: asked ? popoverPageOf(state) : undefined,
    active: asked && popoverOpen(state),
  }
}

/**
 * The rows of the menu of overlapping marks: the state and the title of
 * each explanation, in the order that they started. A press on a row opens
 * the popover of its explanation.
 */
export function overlapEntries(state: WorkspaceState): MenuEntry[] {
  return markedExplanations(state).map((marked) => {
    const mark = textMark(state, marked)
    return {
      kind: 'item',
      label: mark.title,
      mark: <MarkGlyph state={mark.state} />,
    }
  })
}

/**
 * The selection of the state, and what a computer shows by it: Explain. A
 * read-only workspace shows no button. A phone shows its own selection menu
 * and handles, and Explain above the composer.
 */
function selectionOf(
  state: WorkspaceState,
): { message: QuotedMessage; span: TextSpan } | undefined {
  const readOnly = explainReadOnly(state)
  switch (state.explainOpen) {
    case 'select': {
      const to = explainPaths.working
      const by = readOnly ? undefined : <ExplainButton align="middle" to={to} />
      return {
        message: count.message,
        span: { kind: 'selection', quote: count.quote, by, system: true },
      }
    }
    case 'select-message': {
      const by = readOnly ? undefined : <ExplainButton align="end" />
      return {
        message: 'ask',
        span: { kind: 'selection', quote: selectedInMessage, by, system: true },
      }
    }
    case 'none':
    case 'menu':
    case 'popover':
    case 'popover-full':
      return undefined
  }
}

/** Where a press on overlapping marks goes, and their menu when it is open. */
function overlapOf(state: WorkspaceState): MessageMarks['overlap'] {
  if (state.explainMarks !== 'overlap') return undefined
  if (state.explainOpen !== 'menu') return { to: explainPaths.menu }
  return {
    menu: (
      <Menu
        entries={overlapEntries(state)}
        label={markMenuTitle}
        placement="below-start"
        wide
      />
    ),
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
  const marked = markedExplanations(state)
  const spans: Record<QuotedMessage, TextSpan[]> = { ask: [], done: [] }
  const stale = state.explainMarks === 'stale' ? marked.at(0) : undefined
  if (stale === undefined) {
    for (const each of marked) {
      const { message, quote } = each.explanation
      spans[message].push({ kind: 'mark', quote, mark: textMark(state, each) })
    }
  }
  const selection = selectionOf(state)
  if (selection) spans[selection.message].push(selection.span)
  return {
    ask: { spans: spans.ask },
    done: {
      spans: spans.done,
      whole: stale ? textMark(state, stale) : undefined,
      overlap: overlapOf(state),
    },
  }
}

/**
 * Explain on a phone, above the composer, while text of the chat of the
 * first session is selected in a workspace that can send.
 */
export function explainNotice(state: WorkspaceState): ReactNode {
  if (!parentShows(state) || explainReadOnly(state)) return undefined
  if (state.explainOpen === 'select') {
    return <PhoneExplainButton to={explainPaths.working} />
  }
  if (state.explainOpen === 'select-message') return <PhoneExplainButton />
  return undefined
}
