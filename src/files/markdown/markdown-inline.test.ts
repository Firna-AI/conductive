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
