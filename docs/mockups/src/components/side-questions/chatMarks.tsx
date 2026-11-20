import { createContext, useContext, type ReactNode } from 'react'
import type { SideMarkState } from './sideQuestionCopy'

/** A side question that the chat marks, with the run state of its session. */
export type TextMark = {
  key: string
  /** The title of its session, which the prompt gave. */
  title: string
  state: SideMarkState
  /** The screen that a press opens, the overlay of its session, if drawn. */
  to?: string
  /** The overlay of its session is open. */
  active?: boolean
}

/**
 * A part of the text of one message that the chat draws over its text:
 * the mark of a side question, or the selection of the member. `by` is
 * what a computer shows by the selection: the button above it, or the
 * prompt field under it. `system` draws the selection menu and the handles that a
 * phone shows over a selection.
 */
export type TextSpan =
  | { kind: 'mark'; quote: string; mark: TextMark }
  | { kind: 'selection'; quote: string; by?: ReactNode; system: boolean }

/**
 * What the chat draws over one message: its spans, the mark of a side
 * question whose text no longer matches, which covers the whole message,
 * and where a press on overlapping marks goes, with their menu when open.
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
