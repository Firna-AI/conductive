import type { StateCore, Token } from 'markdown-it'

/** The shared inline limit for marks, links, and image alt text. */
const maxInlineDepth = 12
const containers = new Set(['strong', 'em', 's', 'link'])

/** Turns a container boundary into its original Markdown. */
function typed(token: Token, text: string): void {
  token.type = 'text'
  token.tag = ''
  token.nesting = 0
  token.attrs = null
  token.children = null
  token.content = text
}

/** Keeps the original nesting count while turning excess pairs into text. */
function limited(tokens: readonly Token[], base: number): Token[] {
  const result: Token[] = []
  const closes: (string | null)[] = []
  let depth = base
  for (const token of tokens) {
    const name = token.type.replace(/_(?:open|close)$/u, '')
    if (containers.has(name) && token.nesting === 1) {
      const excess = depth >= maxInlineDepth
      const tail = token.meta?.tail
      const after =
        name === 'link' ? (typeof tail === 'string' ? tail : '>') : token.markup
      closes.push(excess ? after : null)
      if (excess)
        typed(
          token,
          name === 'link'
            ? typeof tail === 'string'
              ? '['
              : '<'
            : token.markup,
        )
      depth += 1
    } else if (containers.has(name) && token.nesting === -1) {
      depth -= 1
      const after = closes.pop()
      if (typeof after === 'string') typed(token, after)
    } else if (token.type === 'image') {
      if (depth >= maxInlineDepth) {
        const source = token.meta?.source
        typed(token, typeof source === 'string' ? source : token.content)
      } else {
        // Only retained image containers recurse, so this call is bounded.
        token.children = limited(token.children ?? [], depth + 1)
      }
    }
    const previous = result.at(-1)
    if (token.type === 'text' && previous?.type === 'text') {
      previous.content += token.content
    } else result.push(token)
  }
  return result
}

/** Bounds inline trees before either adapter can construct recursive nodes. */
export function limitInlineDepth(state: StateCore): void {
  for (const token of state.tokens) {
    if (token.type === 'inline') {
      token.children = limited(token.children ?? [], 0)
    }
  }
}
