import { expect, test, vi } from 'vitest'
import { chatParts, type ChatPart } from '../chat/links/chat-parts'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { webAddressParts, type WebAddressPart } from './web-links'

/** Counts source characters inspected by either public link reader. */
function counted<T>(source: string, read: (text: string) => T) {
  let characters = 0
  const value = {
    length: source.length,
    slice: (start?: number, end?: number) => source.slice(start, end),
    indexOf: (search: string, start?: number) => source.indexOf(search, start),
    startsWith: (search: string, start?: number) =>
      source.startsWith(search, start),
    [Symbol.toPrimitive]: () => source,
  }
  const observed = new Proxy(value, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string' && /^\d+$/u.test(key)) {
        characters += 1
        return source[Number(key)]
      }
      return Reflect.get(target, key, receiver)
    },
  })
  const exec = RegExp.prototype.exec
  const regex = vi.spyOn(RegExp.prototype, 'exec').mockImplementation(function (
    this: RegExp,
    text: string,
  ) {
    const start = this.lastIndex
    const result = exec.call(this, text)
    // The legacy sticky label expression scans through its first `]`
    // or line end. Observe that work without replacing its real result.
    if (this.sticky && this.source === String.raw`\[([^\]\n]*)\]\(`) {
      const input = String(text)
      const close = input.indexOf(']', start + 1)
      const line = input.indexOf('\n', start + 1)
      const end = Math.min(
        close < 0 ? input.length : close + 1,
        line < 0 ? input.length : line + 1,
      )
      characters += end - start
    }
    return result
  })
  try {
    // The adapter keeps native string methods and coercion. Its sole
    // difference at this string boundary is observing indexed reads.
    const result = read(observed as unknown as string)
    return { result, characters }
  } finally {
    regex.mockRestore()
  }
}

const links = { orgId: FAKE_IDS.org, workspaces: [] }
const href = 'https://example.com/docs'
const source = `[docs](${href})`
const readers = [
  {
    name: 'chatParts',
    read: (text: string) =>
      chatParts(text, links, {
        web: () => ({ kind: 'web', url: new URL(href) }),
      }),
    plain: (text: string): ChatPart[] => [{ kind: 'text', text }],
    expected: (prefix: string): ChatPart[] => [
      { kind: 'text', text: prefix + '[docs](' },
      { kind: 'link', link: { kind: 'web', url: new URL(href) }, text: href },
      { kind: 'text', text: ')' },
    ],
  },
  {
    name: 'webAddressParts',
    read: (text: string) => webAddressParts(text),
    plain: (text: string): WebAddressPart[] => [{ kind: 'text', text }],
    expected: (prefix: string): WebAddressPart[] => [
      { kind: 'text', text: prefix },
      { kind: 'link', href, source, label: 'docs' },
    ],
  },
]

test.each(readers)(
  '$name reads failed outer labels once and still finds a later link',
  ({ read, plain, expected }) => {
    for (const ending of ['', '] ', '](bad target) ']) {
      const prefixes = [128, 512].map((size) => '['.repeat(size) + ending)
      const tail = ending === '' ? '' : source
      const output = ending === '' ? plain : expected
      const [small, large] = prefixes.map((prefix) =>
        counted<ChatPart[] | WebAddressPart[]>(prefix + tail, read),
      )
      expect(small.result, ending).toEqual(output(prefixes[0]))
      expect(large.result, ending).toEqual(output(prefixes[1]))
      expect(small.characters, ending).toBeGreaterThan(0)
      expect(large.characters, ending).toBeLessThanOrEqual(
        small.characters * 4.5,
      )
    }
  },
)
