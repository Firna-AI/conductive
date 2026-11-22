import type { SessionAnchor } from '../../shared/generated/SessionAnchor'

/** A part of a text, from `start` up to `end`. */
export interface TextSpan {
  start: number
  end: number
}

type Quote = Pick<SessionAnchor, 'quote' | 'before' | 'after'>

/** How many characters of `before` the text holds just before `at`. */
function sharedBefore(text: string, at: number, before: string): number {
  let count = 0
  while (
    count < before.length &&
    count < at &&
    text[at - 1 - count] === before[before.length - 1 - count]
  )
    count += 1
  return count
}

/** How many characters of `after` the text holds from `at` on. */
function sharedAfter(text: string, at: number, after: string): number {
  let count = 0
  while (
    count < after.length &&
    at + count < text.length &&
    text[at + count] === after[count]
  )
    count += 1
  return count
}

/**
 * The place of the quote in the text whose text around it matches the
 * text around the quote best. A tie goes to the first place.
 */
function bestPlace(text: string, quote: Quote): TextSpan | null {
  if (quote.quote === '') return null
  let best: { span: TextSpan; score: number } | null = null
  for (
    let at = text.indexOf(quote.quote);
    at >= 0;
    at = text.indexOf(quote.quote, at + 1)
  ) {
    const end = at + quote.quote.length
    const score =
      sharedBefore(text, at, quote.before) + sharedAfter(text, end, quote.after)
    if (best === null || score > best.score)
      best = { span: { start: at, end }, score }
  }
  return best?.span ?? null
}

/** Each run of white space as one space. */
function oneSpace(text: string): string {
  return text.replace(/\s+/g, ' ')
}

/**
 * The text with each run of white space as one space, with the place in
 * the text of each of its characters.
 */
function folded(text: string): { text: string; places: number[] } {
  let result = ''
  const places: number[] = []
  for (let index = 0; index < text.length; index += 1) {
    const space = /\s/.test(text[index])
    if (space && result.endsWith(' ')) continue
    result += space ? ' ' : text[index]
    places.push(index)
  }
  return { text: result, places }
}

/**
 * Where a text shows the quote of an anchor: the place whose text before
 * and after it matches the anchor best, the first such place on a tie. A
 * quote that the text no longer holds as it is, such as after a change of
 * its white space, matches with each run of white space as one space. Null
 * when the text holds no such quote: the mark then covers its message.
 */
export function findQuote(text: string, quote: Quote): TextSpan | null {
  const exact = bestPlace(text, quote)
  if (exact) return exact
  const loose = folded(text)
  const span = bestPlace(loose.text, {
    quote: oneSpace(quote.quote).trim(),
    before: oneSpace(quote.before),
    after: oneSpace(quote.after),
  })
  if (!span) return null
  return {
    start: loose.places[span.start],
    end: loose.places[span.end - 1] + 1,
  }
}
