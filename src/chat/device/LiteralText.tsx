/** @jsxImportSource react */
/** React's own JSX runtime, also when a Playwright spec renders this file. */
import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { highlightLines } from '../../files/code/highlight'
import { languageOf } from '../../files/code/languages'

/**
 * Characters that do not draw as themselves, so a reader cannot see them:
 * controls, format characters, default-ignorable characters, separators,
 * and each space other than U+0020. U+2800, the empty Braille cell, draws
 * as a space. The tab and the space draw as themselves under `pre-wrap`.
 * A line feed breaks the line and also gets a mark, because a long line
 * that wraps looks the same as a line break.
 */
const HIDDEN =
  /[\p{Cc}\p{Cf}\p{Zs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]/u
const DRAWN: ReadonlySet<string> = new Set(['\t', ' '])

export type LiteralPart =
  | { kind: 'text'; text: string }
  | { kind: 'hidden'; char: string; code: string }

/** The code point of a character, as "U+00A0". */
function codeOf(char: string): string {
  const point = char.codePointAt(0) ?? 0
  return `U+${point.toString(16).toUpperCase().padStart(4, '0')}`
}

/**
 * Splits text into runs that draw as themselves and single hidden
 * characters, in order. The parts join to the same text.
 */
export function literalParts(text: string): LiteralPart[] {
  const parts: LiteralPart[] = []
  let run = ''
  for (const char of text) {
    if (DRAWN.has(char) || !HIDDEN.test(char)) {
      run += char
      continue
    }
    if (run) parts.push({ kind: 'text', text: run })
    run = ''
    parts.push({ kind: 'hidden', char, code: codeOf(char) })
  }
  if (run) parts.push({ kind: 'text', text: run })
  return parts
}

/** The attribute that names the code point of a hidden character. */
const MARK = 'data-literal-code'

/**
 * Draws the mark of each hidden character before it. CSS draws the mark,
 * so the text of the page, a selection, and a copy keep the original text.
 */
const MARK_CSS = `[${MARK}]::before{content:attr(${MARK});margin:0 1px;padding:0 3px;border:1px solid var(--ui-border2,currentColor);border-radius:var(--ui-radius-sm,3px);color:var(--ui-muted,GrayText);font-family:var(--ui-font-mono,monospace);font-size:0.8em;white-space:nowrap}`

/** The line breaks, the tabs, and the repeated spaces show as they are. */
const LITERAL: CSSProperties = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}

/** A hidden bidi control changes the order of no text outside its mark. */
const ISOLATED: CSSProperties = { unicodeBidi: 'isolate' }

function markedText(text: string): ReactNode {
  return literalParts(text).map((part, index) =>
    part.kind === 'text' ? (
      part.text
    ) : (
      <span
        data-literal-code={part.code}
        key={`${index}:${part.code}`}
        style={ISOLATED}
      >
        {part.char}
      </span>
    ),
  )
}

function shellText(text: string): ReactNode {
  return highlightLines(text.split(/(?<=\n)/), languageOf('command.sh'))
    .flat()
    .map((token, index) => (
      <span
        key={index}
        style={
          token.kind === 'plain'
            ? undefined
            : { color: `var(--ui-code-${token.kind})` }
        }
      >
        {markedText(token.text)}
      </span>
    ))
}

/**
 * The text of the selection when the whole selection lies inside `root`,
 * else null. A range gives the text of the page: the original characters,
 * without the marks that CSS draws.
 */
function selectionInside(
  root: Node,
  selection: Selection | null,
): string | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }
  const parts: string[] = []
  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index)
    if (
      !root.contains(range.startContainer) ||
      !root.contains(range.endContainer)
    ) {
      return null
    }
    parts.push(range.toString())
  }
  return parts.join('')
}

/**
 * Copies a selection that lies inside the literal as its original text. A
 * native copy changes some characters, such as U+00A0 into a space. Any
 * other copy stays native. The listener is on the document, because the
 * copy of text that cannot take the focus can go to the body.
 */
function useLiteralCopy(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = root.current
    if (!node) return
    const page = node.ownerDocument
    const onCopy = (event: ClipboardEvent) => {
      const text = selectionInside(node, page.getSelection())
      if (text === null || !event.clipboardData) return
      event.clipboardData.setData('text/plain', text)
      event.preventDefault()
    }
    page.addEventListener('copy', onCopy, true)
    return () => page.removeEventListener('copy', onCopy, true)
  }, [root])
}

/**
 * Text that the Mac runs or keeps, such as a command or its folder, shown
 * exactly as it is. This component owns the whitespace rules, so a caller
 * cannot collapse them: each line feed breaks the line after its mark, and
 * tabs and repeated spaces keep their width. Each hidden character keeps
 * its place, with a visible mark of its code point, such as U+00A0, and a
 * copy of a selection inside it gives the original text. `className` gives
 * the typography, and `lead` comes first, such as a shell prompt. Use
 * `span` inside an element that sets the font already.
 */
export function LiteralText(props: {
  text: string
  className?: string
  lead?: ReactNode
  as?: 'code' | 'span'
  syntax?: 'shell'
}) {
  const Root = props.as ?? 'code'
  const root = useRef<HTMLElement>(null)
  useLiteralCopy(root)
  return (
    <Root className={props.className} ref={root} style={LITERAL}>
      <style href="conductive-literal-marks" precedence="default">
        {MARK_CSS}
      </style>
      {props.lead}
      {props.syntax === 'shell'
        ? shellText(props.text)
        : markedText(props.text)}
    </Root>
  )
}
