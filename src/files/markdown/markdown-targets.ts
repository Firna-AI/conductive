import { readDestination } from './markdown-destination'
import type { BracketPairs } from './markdown-spans'
import { normalizeLabel } from './markdown-text'

/** The address of a link, and the index after its Markdown. */
export interface LinkTarget {
  destination: string
  end: number
}

/** The text of one block, its bracket pairs, and the definitions. */
export interface TargetSource {
  text: string
  brackets: BracketPairs
  definitions: ReadonlyMap<string, string>
}

/** The destination of the reference that the pair at `open` names, if any. */
function reference(
  source: TargetSource,
  open: number,
  close: number,
): string | undefined {
  // A pair that holds another pair holds `]`, which no label holds. So its
  // text is never read, and nested brackets cost no repeated work.
  if (source.brackets.holders.has(open)) return undefined
  const name = normalizeLabel(source.text.slice(open + 1, close))
  return source.definitions.get(name)
}

/**
 * The target of the label pair from `open` to `close`: an inline address,
 * a full or collapsed reference, or a shortcut reference.
 */
export function linkTarget(
  source: TargetSource,
  open: number,
  close: number,
): LinkTarget | null {
  const { text, brackets } = source
  const after = close + 1
  if (text[after] === '(') {
    const inline = readDestination(text, after + 1)
    if (inline) return inline
  }
  const refClose = text[after] === '[' ? brackets.close.get(after) : undefined
  if (refClose !== undefined) {
    // `[label][]` names the label. `[label][ref]` names the ref.
    const destination =
      refClose === after + 1
        ? reference(source, open, close)
        : reference(source, after, refClose)
    if (destination !== undefined) return { destination, end: refClose + 1 }
  }
  const destination = reference(source, open, close)
  return destination === undefined ? null : { destination, end: after }
}
