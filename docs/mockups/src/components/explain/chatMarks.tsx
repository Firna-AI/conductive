import { createContext, useContext, type ReactNode } from 'react'
import type { ExplainMarkState } from '../../../../../src/ui/components/explain/explainCopy'

/** An explanation that the chat marks, with the run state of its session. */
export type TextMark = {
  key: string
  /** The title of its explanation, which the written prompt gave. */
  title: string
  state: ExplainMarkState
  /** The screen that a press opens, the popover of its explanation, if drawn. */
  to?: string
  /** The popover of its explanation is open, and keeps to this mark. */
  active?: boolean
}

/**
 * A part of the text of one message that the chat draws over its text:
 * the mark of an explanation, or the selection of the member. `by` is what
 * a computer shows by the selection: the Explain button above it. `system`
 * draws the selection menu and the handles that a phone shows over a
 * selection.
 */
export type TextSpan =
  | { kind: 'mark'; quote: string; mark: TextMark }
  | { kind: 'selection'; quote: string; by?: ReactNode; system: boolean }

/**
 * What the chat draws over one message: its spans, the mark of an
 * explanation whose text no longer matches, which covers the whole
 * message, and where a press on overlapping marks goes, with their menu
 * when open.
 */
export type MessageMarks = {
  spans: readonly TextSpan[]
  whole?: TextMark
  overlap?: { to?: string; menu?: ReactNode }
}

const MarksContext = createContext<Readonly<Record<string, MessageMarks>>>({})

/** Gives the chat inside it the marks and the selection of each message. */
export function ChatMarks(props: {
  marks: Readonly<Record<string, MessageMarks>>
  children: ReactNode
}) {
  return (
    <MarksContext.Provider value={props.marks}>
      {props.children}
    </MarksContext.Provider>
  )
}

/** The marks and the selection of the message with this ID, if any. */
export function useMessageMarks(id: string): MessageMarks | undefined {
  return useContext(MarksContext)[id]
}
