import type { MarkdownIt, StateBlock } from 'markdown-it'

/**
 * Keeps one source-mapped container beyond the views' limit. Inside it,
 * list and quote marks stay paragraph text, so parsing cannot recurse
 * without a bound or skip the outer list's following blocks.
 */
export function limitBlockDepth(parser: MarkdownIt, maxDepth: number): void {
  const depths = new WeakMap<StateBlock, number>()
  const rules = parser.block.ruler
  for (const name of ['list', 'blockquote']) {
    const rule = rules.__rules__[rules.__find__(name)]
    const original = rule.fn
    rules.at(
      name,
      (state, start, end, silent) => {
        const depth = depths.get(state) ?? 0
        if (depth > maxDepth) return false
        if (silent) return original(state, start, end, true)
        depths.set(state, depth + 1)
        try {
          return original(state, start, end, false)
        } finally {
          depths.set(state, depth)
        }
      },
      { alt: rule.alt },
    )
  }
  const table = rules.__rules__[rules.__find__('table')]
  const readTable = table.fn
  rules.at(
    'table',
    (state, start, end, silent) => {
      if ((depths.get(state) ?? 0) > maxDepth) return false
      return readTable(state, start, end, silent)
    },
    { alt: table.alt },
  )
}
