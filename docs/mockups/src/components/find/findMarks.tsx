import { createContext, Fragment, useContext, type ReactNode } from 'react'
import styles from './FindMarks.module.css'

/** The count of the find bar: the place of the current match, of the total. */
export type FindCount = { place: number; total: number }

/**
 * The find bar of the shown tab, and the matches that it colours in the tab.
 * A view runs no script, so the state names its current match and the folds
 * that the bar opened, and it gives the count that the bar shows.
 */
export type FindState = {
  /** The text in the field. An empty field finds nothing. */
  query: string
  /** The count of the bar. A total of 0 shows "No matches". */
  count?: FindCount
  /**
   * A phrase of the text of the tab that holds the current match: the first
   * match that starts in it is the current match. Only one text holds it.
   */
  current?: string
  /** The chat items whose fold and message line the bar opened. */
  opened?: readonly string[]
}

/** How a part of a text shows: a match, or the current match. */
type Mark = 'match' | 'current'

/** A part of a text: plain, a match, or the current match. */
export type MarkedPart = { text: string; mark?: Mark }

const FindContext = createContext<FindState | undefined>(undefined)

/** The text of the shown tab, which the find bar searches. */
export function FindScope(props: { find?: FindState; children: ReactNode }) {
  return (
    <FindContext.Provider value={props.find}>
      {props.children}
    </FindContext.Provider>
  )
}

/** The find bar over the text, if it is open. */
export function useFind(): FindState | undefined {
  return useContext(FindContext)
}

/**
 * The text with each character in lower case, where that keeps its length,
 * so each place in the folded text is the same place in the text.
 */
function folded(text: string): string {
  return Array.from(text, (char) => {
    const lower = char.toLowerCase()
    return lower.length === char.length ? lower : char
  }).join('')
}

/** The start of each match of the query in the text, in any case. */
function matchStarts(text: string, query: string): number[] {
  if (query === '') return []
  const haystack = folded(text)
  const needle = folded(query)
  const starts: number[] = []
  let start = haystack.indexOf(needle)
  while (start >= 0) {
    starts.push(start)
    start = haystack.indexOf(needle, start + needle.length)
  }
  return starts
}

/** Which match of the text is the current match, if one is. */
function currentMatch(
  text: string,
  starts: readonly number[],
  phrase: string | undefined,
): number {
  if (phrase === undefined) return -1
  const at = text.indexOf(phrase)
  if (at < 0) return -1
  return starts.findIndex((start) => start >= at && start < at + phrase.length)
}

/**
 * The parts of a text, with each match of the find bar marked. Without an
 * open bar, or without a match, the text is one plain part.
 */
export function markedParts(
  text: string,
  find: FindState | undefined,
): MarkedPart[] {
  const starts = find ? matchStarts(text, find.query) : []
  if (!find || starts.length === 0) return [{ text }]
  const current = currentMatch(text, starts, find.current)
  const length = find.query.length
  const parts: MarkedPart[] = []
  let last = 0
  starts.forEach((start, index) => {
    if (start > last) parts.push({ text: text.slice(last, start) })
    const mark = index === current ? 'current' : 'match'
    parts.push({ text: text.slice(start, start + length), mark })
    last = start + length
  })
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** A piece of a token of a line, inside one part of that line. */
export type MarkedToken<Kind> = { kind: Kind; text: string; mark?: Mark }

/**
 * The tokens of a line, cut at the edges of its marked parts. So a match
 * can cross the coloured tokens of one line. The parts hold the text of
 * the tokens, in the same order.
 */
export function markedTokens<Kind>(
  tokens: readonly { kind: Kind; text: string }[],
  parts: readonly MarkedPart[],
): MarkedToken<Kind>[] {
  const pieces: MarkedToken<Kind>[] = []
  let part = 0
  let used = 0
  for (const token of tokens) {
    let rest = token.text
    while (rest.length > 0) {
      const current = parts[part]
      if (!current) {
        pieces.push({ kind: token.kind, text: rest })
        break
      }
      const taken = Math.min(current.text.length - used, rest.length)
      const { mark } = current
      pieces.push({ kind: token.kind, text: rest.slice(0, taken), mark })
      rest = rest.slice(taken)
      used += taken
      if (used === current.text.length) {
        part += 1
        used = 0
      }
    }
  }
  return pieces
}

/**
 * A marked piece of text in the colours of a match. The app colours the
 * same ranges with the CSS Custom Highlight API, and adds no element.
 */
export function MatchMark(props: { mark: Mark; children: ReactNode }) {
  return <span className={styles[props.mark]}>{props.children}</span>
}

/** A text of the shown tab, with the matches of an open find bar coloured. */
export function Found(props: { text: string }) {
  const parts = markedParts(props.text, useFind())
  if (parts.length === 1 && parts[0]?.mark === undefined) return props.text
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part.mark ? (
        <MatchMark mark={part.mark}>{part.text}</MatchMark>
      ) : (
        part.text
      )}
    </Fragment>
  ))
}
