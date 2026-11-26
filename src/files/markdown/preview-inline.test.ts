import { expect, it } from 'vitest'
import type { MdInline } from './markdown-document'
import { previewDocument } from './preview-blocks'

/** The inline content of a file of one paragraph. */
function inline(source: string): MdInline[] {
  const [block] = previewDocument(source).blocks
  if (block?.kind !== 'paragraph') throw new Error(`No paragraph: ${source}`)
  return block.text
}

/** The plain text of inline content, as a reader sees it. */
function plain(nodes: readonly MdInline[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'text' || node.kind === 'code') return node.text
      if (node.kind === 'break') return ' '
      return plain(node.children)
    })
    .join('')
}

function links(nodes: readonly MdInline[]): number {
  return nodes.filter((node) => node.kind === 'link').length
}

/** The reference definitions of the bracket shapes. */
const references =
  '\n\n[x]: https://e.com/x\n[a]: https://e.com/a\n[b]: https://e.com/b'

it('keeps every bracket of nested brackets around a shortcut reference, and links only the reference', () => {
  // The input of finding 8 of the old reader.
  for (const levels of [500, 2_000]) {
    const nested = inline(
      `${'['.repeat(levels)}x${']'.repeat(levels)}${references}`,
    )
    expect(links(nested), `nested ${levels}`).toBe(1)
    expect(plain(nested), `nested ${levels}`).toBe(
      '['.repeat(levels - 1) + 'x' + ']'.repeat(levels - 1),
    )
    // Each level has a shortcut link, and a full reference that holds pairs.
    const chain = inline(
      `[a]${'[[b]'.repeat(levels)}${']'.repeat(levels)}${references}`,
    )
    expect(plain(chain).replace(/[[\]]/gu, ''), `chain ${levels}`).toBe(
      'a' + 'b'.repeat(levels),
    )
  }
})

it('keeps every part of a long link text whose address does not link', () => {
  // More nodes than one spread into a call can take on the stack.
  const parts = 100_000
  let nodes: readonly MdInline[] = []
  expect(() => {
    nodes = inline(`[${'`a` '.repeat(parts)}](docs/x.md)`)
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
    // Two tildes strike text through, around and inside emphasis. One
    // tilde stays text.
    [
      '~~Hi~~ Hello, ~there~ **world ~~now~~**',
      '<del>Hi</del> Hello, ~there~ <strong>world <del>now</del></strong>',
    ],
  ] as const
  // One comparison of the whole table names each case that differs.
  const actual = cases.map(([text]) => [text, markup(inline(text))])
  expect(actual).toEqual(cases)
})

it('reads a link label as text of its block, so only the edges of the block and a long run drop its line breaks, and an empty link ends no run', () => {
  const link = (label: string) => `<a href="https://example.com/">${label}</a>`
  const cases = [
    // The inputs of finding 44 of review round 1.
    ['a [b<br>](https://example.com)c', `a ${link('b<br>')}c`],
    ['a [<br>b](https://example.com)c', `a ${link('<br>b')}c`],
    // A hard line break of CommonMark at the edge of a label.
    ['a [b\\\n](https://example.com)c', `a ${link('b<br>')}c`],
    ['a [b  \n](https://example.com)c', `a ${link('b<br>')}c`],
    ['a [\\\nb](https://example.com)c', `a ${link('<br>b')}c`],
    [
      'a [**b<br>**](https://example.com)c',
      `a ${link('<strong>b<br></strong>')}c`,
    ],
    // The edges of the block and a run of breaks reach into the label.
    ['[<br>b](https://example.com) c', `${link('b')} c`],
    ['c [b<br>](https://example.com)', `c ${link('b')}`],
    [
      'a [b<br><br><br>](https://example.com)<br><br>c',
      `a ${link('b<br><br>')}c`,
    ],
    // A link that holds nothing stays an empty link, and it ends no run.
    ['a<br>[](https://example.com)<br><br>c', `a<br>${link('')}<br>c`],
    // The preview tests no label for an address: a label on two lines shows
    // as typed, and the link opens its real address, which its title gives.
    [
      '[https:<br>//good.example/login](https://evil.example/phish)',
      '<a href="https://evil.example/phish">https:<br>//good.example/login</a>',
    ],
  ] as const
  // One comparison of the whole table names each case that differs.
  const actual = cases.map(([text]) => [text, markup(inline(text))])
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
  const markers = 20_000
  const { levels, inner } = strongLevels(
    inline(`${'*'.repeat(markers)}leaf${'*'.repeat(markers)}`),
  )
  expect(levels).toBe(12)
  // Each level of strong text takes two markers from each run.
  const rest = '*'.repeat(markers - 24)
  expect(inner).toEqual([{ kind: 'text', text: `${rest}leaf${rest}` }])

  // A link 13 levels deep shows as typed.
  const deep = strongLevels(
    inline(`${'*'.repeat(24)}[x](https://e.com "X")${'*'.repeat(24)}`),
  )
  expect(deep).toEqual({
    levels: 12,
    inner: [{ kind: 'text', text: '[x](https://e.com "X")' }],
  })

  // Links do not nest, so of nested link texts only the inner one links.
  const brackets = 1_000
  const end = '](https://e.com)'
  expect(inline(`${'['.repeat(brackets)}x${end.repeat(brackets)}`)).toEqual([
    { kind: 'text', text: '['.repeat(brackets - 1) },
    {
      kind: 'link',
      href: 'https://e.com/',
      children: [{ kind: 'text', text: 'x' }],
    },
    { kind: 'text', text: end.repeat(brackets - 1) },
  ])
})

it('shows a link in the label of a link as its text, so no link holds a link', () => {
  expect(inline('[a <https://x.com> b](https://y.com)')).toEqual([
    {
      kind: 'link',
      href: 'https://y.com/',
      children: [{ kind: 'text', text: 'a https://x.com b' }],
    },
  ])
})

it.each([
  [
    '[Wiki](https://en.wikipedia.org/wiki/Function_(mathematics))',
    'https://en.wikipedia.org/wiki/Function_(mathematics)',
    'Wiki',
  ],
  [
    '[Wiki](<https://en.wikipedia.org/wiki/Function_(mathematics)>)',
    'https://en.wikipedia.org/wiki/Function_(mathematics)',
    'Wiki',
  ],
  [
    String.raw`[Wiki](https://en.wikipedia.org/wiki/Function_\(mathematics\))`,
    'https://en.wikipedia.org/wiki/Function_(mathematics)',
    'Wiki',
  ],
  [
    '[Page](https://github.com/acme/app/blob/main/app/(marketing)/page.tsx#L4)',
    'https://github.com/acme/app/blob/main/app/(marketing)/page.tsx#L4',
    'Page',
  ],
  ['[local](http://[::1])', 'http://[::1]/', 'local'],
  [
    '[docs]( https://example.com/docs "Guide" )',
    'https://example.com/docs',
    'docs',
  ],
  [
    "[docs](<https://example.com/docs> 'Guide')",
    'https://example.com/docs',
    'docs',
  ],
  [
    '[docs](https://example.com/docs (Guide))',
    'https://example.com/docs',
    'docs',
  ],
])(
  'keeps the file preview destination and title handling for %s',
  (source, href, label) => {
    expect(inline(source)).toEqual([
      { kind: 'link', href, children: [{ kind: 'text', text: label }] },
    ])
  },
)

it('links an address of any length, and keeps an address with parentheses past the nesting limit as text', () => {
  const long = `https://example.com/${'a'.repeat(2001)}`
  for (const source of [`[docs](${long})`, `[docs](<${long}>)`]) {
    expect(inline(source)).toEqual([
      { kind: 'link', href: long, children: [{ kind: 'text', text: 'docs' }] },
    ])
  }
  const deep = `[docs](https://example.com/${'('.repeat(33)}x${')'.repeat(33)})`
  const nodes = inline(deep)
  expect(links(nodes)).toBe(0)
  expect(plain(nodes)).toBe(deep)
})
