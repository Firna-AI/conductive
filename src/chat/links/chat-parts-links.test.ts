import { describe, expect, test } from 'vitest'
import type { Workspace } from '../../shared/generated/Workspace'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { chatParts, type ChatPart } from './chat-parts'
import { webLinkOf } from './links-test-kit'

const linked = workspaceFixtures().workspaces.workspaces[0] as Workspace
const links = { orgId: FAKE_IDS.org, workspaces: [linked] }

/** The parts of a sent message. */
const sent = (text: string) => chatParts(text, links, { web: webLinkOf })

const text = (value: string): ChatPart => ({ kind: 'text', text: value })

/** A link to another site, with its address as the text has it. */
function web(href: string, source = href): ChatPart {
  return {
    kind: 'link',
    link: { kind: 'web', url: new URL(href) },
    text: source,
  }
}

describe('the links of a sent message', () => {
  test.each(['HTTPS', 'hTtPs', 'HTTP', 'hTtP'])(
    'a sent message links %s addresses and keeps each typed form',
    (scheme) => {
      const href = `${scheme}://example.com/Api/Case?q=MiXeD#Part`
      expect(
        sent(
          `Read ${href}, <${href}>, \`${href}\`, \`curl ${href}\`, and [Docs](${href}).`,
        ),
      ).toEqual([
        text('Read '),
        web(href),
        text(', <'),
        web(href),
        text('>, '),
        { kind: 'code', text: href, link: { kind: 'web', url: new URL(href) } },
        text(', '),
        { kind: 'code', text: `curl ${href}` },
        text(', and [Docs]('),
        web(href),
        text(').'),
      ])
    },
  )

  test('a sent message shows a Markdown link as typed: its label stays text and code, and its address is a link', () => {
    const pull = 'https://github.com/acme/storefront/pull/468'
    const guide = 'https://design.acme.example/forms/address'
    expect(
      sent(
        `Match ${pull}, and follow [\`https://old.acme.example/forms\`](<${guide}>).`,
      ),
    ).toEqual([
      text('Match '),
      web(pull),
      text(', and follow ['),
      { kind: 'code', text: 'https://old.acme.example/forms' },
      text('](<'),
      web(guide),
      text('>).'),
    ])
  })

  test('a sent message keeps Markdown around the complete address as typed', () => {
    const href = 'https://en.wikipedia.org/wiki/Function_(mathematics)'
    expect(sent(`[Wiki](<${href}>)`)).toEqual([
      text('[Wiki](<'),
      web(href),
      text('>)'),
    ])
    // The link title stays text, also the address in it, and the `!` at the
    // end of the address stays in the link.
    const yahoo = 'https://en.wikipedia.org/wiki/Yahoo!'
    expect(sent(`[Yahoo](${yahoo} "About https://www.yahoo.com")`)).toEqual([
      text('[Yahoo]('),
      web(yahoo),
      text(' "About https://www.yahoo.com")'),
    ])
  })

  test('a sent message keeps Markdown address escapes as typed and opens the decoded address', () => {
    expect(sent(String.raw`[Wiki](https://example.com/a\(b\))`)).toEqual([
      text('[Wiki]('),
      web('https://example.com/a(b)', String.raw`https://example.com/a\(b\)`),
      text(')'),
    ])
  })

  test.each([
    [String.raw`https://example.com/a\>b`, 'https://example.com/a%3Eb'],
    [String.raw`https://example.com/a\<b`, 'https://example.com/a%3Cb'],
  ])(
    'a sent message keeps %s as typed and opens the full decoded address',
    (address, href) => {
      expect(sent(`[x](<${address}>)`)).toEqual([
        text('[x](<'),
        web(href, address),
        text('>)'),
      ])
    },
  )

  test.each([
    ['<', 'https://example.com/a', '<b>)'],
    [String.raw`\\<`, String.raw`https://example.com/a\\`, '<b>)'],
    ['\n', 'https://example.com/a', '\nb>)'],
    ['\\\n', 'https://example.com/a\\', '\nb>)'],
  ])(
    'a sent message keeps a refused angle destination with %j as typed',
    (boundary, href, after) => {
      expect(sent(`[x](<https://example.com/a${boundary}b>)`)).toEqual([
        text('[x](<'),
        web(href),
        text(after),
      ])
    },
  )
})
