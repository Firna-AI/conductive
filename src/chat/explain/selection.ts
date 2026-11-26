import { offsetAt, textModel } from './text-model'

/** The most text on each side of a quote that a start sends. */
const contextLength = 300

/**
 * A finished selection inside one message that Explain can explain: the
 * message, the selected text as the chat shows it, and the text around it.
 */
export interface ExplainSelection {
  messageId: string
  quote: string
  before: string
  after: string
  /** The live range of the selection, which places Explain by it. */
  range: Range
}

/** The attributes that mark the text of a message that Explain reads. */
export const messageAttributes = {
  chat: 'data-explain-chat',
  message: 'data-explain-message',
  done: 'data-explain-done',
} as const

/** The element of a message of the chat that holds a node, if any. */
function messageOf(node: Node, chat: string): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement
  const message = element?.closest<HTMLElement>(
    `[${messageAttributes.message}]`,
  )
  return message?.getAttribute(messageAttributes.chat) === chat ? message : null
}

/** The range holds no text other than white space. */
function blank(range: Range): boolean {
  return range.toString().trim() === ''
}

/**
 * The one message that holds the text of a range. A range that ends just
 * after a message, with no text after it, still lies in that message, as a
 * triple click on its last line gives it. A range that holds text of two
 * messages, or of a tool line or a notice, lies in none.
 */
function holder(range: Range, chat: string): HTMLElement | null {
  const first = messageOf(range.startContainer, chat)
  const last = messageOf(range.endContainer, chat)
  if (first && first === last) return first
  if (first) {
    const rest = range.cloneRange()
    rest.setStartAfter(first)
    if (blank(rest)) return first
  }
  if (last) {
    const lead = range.cloneRange()
    lead.setEndBefore(last)
    if (blank(lead)) return last
  }
  return null
}

/** The part of a range inside an element. */
function within(range: Range, element: HTMLElement): Range {
  const part = range.cloneRange()
  if (!element.contains(range.startContainer)) part.setStart(element, 0)
  if (!element.contains(range.endContainer))
    part.setEnd(element, element.childNodes.length)
  return part
}

/**
 * The selection of the page as Explain reads it, in the chat whose
 * messages carry `chat`: finished text inside one member message or one
 * finished agent message. The quote leaves out white space at its ends, and
 * the text on each side keeps at most 300 characters next to it. Null for
 * any other selection, such as one that spans two messages.
 */
export function explainableSelection(
  selection: Selection | null,
  chat: string,
): ExplainSelection | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
    return null
  const range = selection.getRangeAt(0)
  const message = holder(range, chat)
  const messageId = message?.getAttribute(messageAttributes.message)
  if (!message || !messageId || !message.hasAttribute(messageAttributes.done))
    return null
  const model = textModel(message)
  const part = within(range, message)
  let start = offsetAt(model, part.startContainer, part.startOffset)
  let end = offsetAt(model, part.endContainer, part.endOffset)
  while (start < end && /\s/.test(model.text[start])) start += 1
  while (end > start && /\s/.test(model.text[end - 1])) end -= 1
  if (start >= end) return null
  return {
    messageId,
    quote: model.text.slice(start, end),
    before: model.text.slice(Math.max(0, start - contextLength), start),
    after: model.text.slice(end, end + contextLength),
    range,
  }
}
