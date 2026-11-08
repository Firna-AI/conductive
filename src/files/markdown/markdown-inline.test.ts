import { expect, it } from 'vitest'
import { parseInline, plainText, type MdInline } from './markdown-inline'

/** Definitions that count the characters of each key that the parser reads. */
class CountedDefinitions extends Map<string, string> {
  characters = 0

  override get(key: string): string | undefined {
    this.characters += key.length
    return super.get(key)
  }
}

const shapes = [
  {
    // The input of finding 8: nested brackets around a shortcut reference.
    name: 'nested brackets',
    text: (levels: number) => '['.repeat(levels) + 'x' + ']'.repeat(levels),
    links: () => 1,
    plain: (levels: number) =>
      '['.repeat(levels - 1) + 'x' + ']'.repeat(levels - 1),
  },
  {
    // Each level has a shortcut link, and a full reference that holds pairs.
    name: 'reference chain',
    text: (levels: number) =>
      '[a]' + '[[b]'.repeat(levels) + ']'.repeat(levels),
    links: (levels: number) => levels + 1,
    plain: (levels: number) => 'a' + '[b'.repeat(levels) + ']'.repeat(levels),
  },
]

function parse(text: string) {
  const definitions = new CountedDefinitions([
    ['x', 'https://e.com/x'],
    ['a', 'https://e.com/a'],
    ['b', 'https://e.com/b'],
  ])
  const nodes = parseInline(text, definitions)
  return { nodes, characters: definitions.characters }
}

function links(nodes: readonly MdInline[]): number {
  return nodes.filter((node) => node.kind === 'link').length
}

it('reads the name of each reference once, also inside nested brackets', () => {
  for (const shape of shapes) {
    const small = parse(shape.text(500))
    const large = parse(shape.text(2_000))
    expect(links(small.nodes), shape.name).toBe(shape.links(500))
    expect(links(large.nodes), shape.name).toBe(shape.links(2_000))
    expect(plainText(small.nodes), shape.name).toBe(shape.plain(500))
    expect(plainText(large.nodes), shape.name).toBe(shape.plain(2_000))
    expect(small.characters, shape.name).toBeGreaterThan(0)
    expect(large.characters, shape.name).toBeLessThanOrEqual(
      small.characters * 4.5,
    )
  }
})

it('keeps every part of a long link text whose address does not link', () => {
  // More nodes than one spread into a call can take on the stack.
  const parts = 100_000
  let nodes: readonly MdInline[] = []
  expect(() => {
    nodes = parseInline(`[${'`a` '.repeat(parts)}](docs/x.md)`, new Map())
  }).not.toThrow()
  expect(nodes.filter((node) => node.kind === 'code')).toHaveLength(parts)
  expect(links(nodes)).toBe(0)
})

/** Inline content as compact markup, in the form of the CommonMark examples. */
function markup(nodes: readonly MdInline[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text':
          return node.text
        case 'code':
          return `<code>${node.text}</code>`
        case 'break':
          return '<br>'
        case 'link':
          return `<a href="${node.href}">${markup(node.children)}</a>`
        case 'emphasis':
          return `<em>${markup(node.children)}</em>`
        case 'strong':
          return `<strong>${markup(node.children)}</strong>`
        case 'strike':
          return `<del>${markup(node.children)}</del>`
      }
    })
    .join('')
}

it('pairs emphasis and strong emphasis markers by the CommonMark rules', () => {
  const cases = [
    // One closing run closes two openers of different sizes.
    ['**bold and *italic***', '<strong>bold and <em>italic</em></strong>'],
    // A link groups more tightly than emphasis, and its text pairs alone.
    [
      '*See [*this*](https://e.com) now*',
      '<em>See <a href="https://e.com/"><em>this</em></a> now</em>',
    ],
    [
      '*see [docs](https://e.com/a*b) now*',
      '<em>see <a href="https://e.com/a*b">docs</a> now</em>',
    ],
    ['*[foo*](https://e.com)', '*<a href="https://e.com/">foo*</a>'],
    // Punctuation decides which side a run flanks.
    ['*a (*b*) c*', '<em>a (<em>b</em>) c</em>'],
    // A closer takes the nearest opener.
    ['**foo **bar baz**', '**foo <strong>bar baz</strong>'],
    // The rule of 3 for a run that can open and close.
    ['*foo**bar*', '<em>foo**bar</em>'],
    ['snake_case_name and a*b*c', 'snake_case_name and a<em>b</em>c'],
    ['\\*not emphasis*', '*not emphasis*'],
    ['*a `*` b*', '<em>a <code>*</code> b</em>'],
    // Tildes strike text through, around and inside emphasis.
    [
      '~~Hi~~ Hello, ~there~ **world ~~now~~**',
      '<del>Hi</del> Hello, <del>there</del> <strong>world <del>now</del></strong>',
    ],
  ] as const
  // One comparison of the whole table names each case that differs.
  const actual = cases.map(([text]) => [
    text,
    markup(parseInline(text, new Map())),
  ])
  expect(actual).toEqual(cases)
})

/** The levels of strong text that wrap the content, without recursion. */
function strongLevels(nodes: readonly MdInline[]) {
  let levels = 0
  let inner = nodes
  for (;;) {
    const [first] = inner
    if (inner.length !== 1 || first.kind !== 'strong') return { levels, inner }
    levels += 1
    inner = first.children
  }
}

it('nests inline content at most 12 levels deep, and shows deeper markers and links as typed', () => {
  const markers = 10_000
  const nodes = parseInline(
    `${'*'.repeat(markers)}x${'*'.repeat(markers)}`,
    new Map(),
  )
  const { levels, inner } = strongLevels(nodes)
  expect(levels).toBe(12)
  // Each level of strong text takes two markers from each run.
  const rest = '*'.repeat(markers - 24)
  expect(inner).toEqual([{ kind: 'text', text: `${rest}x${rest}` }])

  // Each link text holds the next link. A link text holds no link, so the
  // inner links show their text, and the 13th level shows as typed.
  const links = 1_000
  const end = '](https://e.com)'
  const linked = parseInline(
    `${'['.repeat(links)}x${end.repeat(links)}`,
    new Map(),
  )
  const typed = `${'['.repeat(links - 12)}x${end.repeat(links - 12)}`
  expect(linked).toEqual([
    {
      kind: 'link',
      href: 'https://e.com/',
      children: [{ kind: 'text', text: typed }],
    },
  ])
})
