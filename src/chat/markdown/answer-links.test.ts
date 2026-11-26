import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import type { Workspace } from '../../shared/generated/Workspace'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { InlineMark } from './agent-inline'
import type { AnswerPart } from './answer-parts'
import { partsOf, readingOf, shapes } from './answer-test-kit'

const linked = workspaceFixtures().workspaces.workspaces[0] as Workspace
const links = { orgId: FAKE_IDS.org, workspaces: [linked] }

/** The parts of an answer in a chat without a tree. */
const answer = (text: string) => partsOf(text, readingOf(links))

const text = (value: string): AnswerPart => ({ kind: 'text', text: value })

const mark =
  (kind: InlineMark) =>
  (...parts: AnswerPart[]): AnswerPart => ({ kind: 'mark', mark: kind, parts })
const strong = mark('strong')
const emphasis = mark('emphasis')

/** A link to another site, with its words. */
function web(href: string, ...words: AnswerPart[]): AnswerPart {
  return { kind: 'link', link: { kind: 'web', url: new URL(href) }, words }
}

describe('the links of an answer', () => {
  test.each(['https://x.example', 'https://y.example'])(
    'an answer replaces an address label with its destination %s after plain text',
    (href) => {
      expect(answer(`Seen [https://x.example](${href}) now`)).toEqual([
        text('Seen '),
        web(href, text(href)),
        text(' now'),
      ])
    },
  )

  test.each(['HTTPS', 'hTtPs', 'HTTP', 'hTtP'])(
    'an answer links %s addresses and keeps their typed bare and code text',
    (scheme) => {
      const href = `${scheme}://example.com/Api/Case?q=MiXeD#Part`
      expect(
        answer(
          `Read ${href}, <${href}>, \`${href}\`, \`curl ${href}\`, and [Docs](${href}).`,
        ),
      ).toEqual([
        text('Read '),
        web(href, text(href)),
        text(', '),
        web(href, text(href)),
        text(', '),
        { kind: 'code', text: href, link: { kind: 'web', url: new URL(href) } },
        text(', '),
        { kind: 'code', text: `curl ${href}` },
        text(', and '),
        web(href, text('Docs')),
        text('.'),
      ])
    },
  )

  test('an answer shows a bare address as typed, keeps it bold in bold, and shows a Markdown link as its label with its code and bold, or as its address when the label reads as one', () => {
    const pull = 'https://github.com/acme/app/pull/2'
    const docs = 'https://docs.places.example/v1'
    const guide = 'https://docs.places.example/v1/guide'
    expect(
      answer(
        `See **${pull}**, the [**places** \`v1\` docs](${docs}) and [ https://places.example/docs ](${guide}).`,
      ),
    ).toEqual([
      text('See '),
      strong(web(pull, text(pull))),
      text(', the '),
      web(
        docs,
        strong(text('places')),
        text(' '),
        { kind: 'code', text: 'v1' },
        text(' docs'),
      ),
      text(' and '),
      web(guide, text(guide)),
      text('.'),
    ])
  })

  test('an answer shows a Markdown link whose address is no link as typed, with its link title, and shows the alt text of a web image as a link', () => {
    const typed = `Sign in at [the **portal**](https://user:secret@portal.example/) or https://user@portal.example/login, not [the API](${FAKE_ORIGIN}/api/workspaces "API") or <https://user@portal.example/>.`
    const picture = 'https://cdn.acme.example/form.png'
    expect({
      typed: answer(typed),
      image: answer(`![The **form**](${picture})`),
    }).toEqual({
      typed: [
        text('Sign in at [the '),
        strong(text('portal')),
        text(
          `](https://user:secret@portal.example/) or https://user@portal.example/login, not [the API](${FAKE_ORIGIN}/api/workspaces "API") or <https://user@portal.example/>.`,
        ),
      ],
      image: [web(picture, text('The '), strong(text('form')))],
    })
  })

  test('the alt text of an image shows its address when it reads as one or shows nothing, an image without a link shows its alt text, and an image in a label shows its alt text there', () => {
    const shot = 'https://cdn.acme.example/a.png'
    expect(
      answer(
        `![https://evil.example](${shot}) ![](${shot}) ![Flow](mailto:a@b.example) [![Flow](${shot}) chart](https://docs.acme.example/)`,
      ),
    ).toEqual([
      web(shot, text(shot)),
      text(' '),
      web(shot, text(shot)),
      text(' Flow '),
      web('https://docs.acme.example/', text('Flow chart')),
    ])
  })

  test('a label tests as it shows, without its marks and with no character for a line break, so a label in emphasis or on two lines cannot hide the address', () => {
    expect(
      answer(
        '[*https://evil.example*](https://good.example/a) [~~www.evil.example~~](https://good.example/b) [*Good*](https://good.example/c) [https:<br>//good.example/login](https://evil.example/phish)',
      ),
    ).toEqual([
      web('https://good.example/a', text('https://good.example/a')),
      text(' '),
      web('https://good.example/b', text('https://good.example/b')),
      text(' '),
      web('https://good.example/c', emphasis(text('Good'))),
      text(' '),
      web('https://evil.example/phish', text('https://evil.example/phish')),
    ])
  })

  test('inline code that holds one address alone is a link in its code box, also for a workspace link, and other code stays code', () => {
    const keys = ' https://places.example/account/keys '
    expect(
      answer(
        `Open \`${keys}\`, \`curl https://places.example\`, \`https://places.example.\`, and \`${linked.link}\`.`,
      ),
    ).toEqual([
      text('Open '),
      {
        kind: 'code',
        text: keys.trim(),
        link: {
          kind: 'web',
          url: new URL('https://places.example/account/keys'),
        },
      },
      text(', '),
      { kind: 'code', text: 'curl https://places.example' },
      text(', '),
      { kind: 'code', text: 'https://places.example.' },
      text(', and '),
      {
        kind: 'code',
        text: linked.link,
        link: {
          kind: 'app',
          url: new URL(linked.link),
          to: routes.workspace(FAKE_IDS.org, linked.id),
        },
      },
      text('.'),
    ])
  })

  test.each([
    'https://en.wikipedia.org/wiki/Function_(mathematics)',
    '<https://en.wikipedia.org/wiki/Function_(mathematics)>',
    String.raw`https://en.wikipedia.org/wiki/Function_\(mathematics\)`,
    'https://en.wikipedia.org/wiki/Function_(mathematics) "Function"',
    "<https://en.wikipedia.org/wiki/Function_(mathematics)> 'Function'",
    String.raw` https://en.wikipedia.org/wiki/Function_\(mathematics\) (Function) `,
  ])(
    'an answer shows [Wiki](%s) as its label alone and links its whole decoded destination',
    (address) => {
      expect(answer(`Read [Wiki](${address}).`)).toEqual([
        text('Read '),
        web(
          'https://en.wikipedia.org/wiki/Function_(mathematics)',
          text('Wiki'),
        ),
        text('.'),
      ])
    },
  )

  test('an answer keeps balanced square brackets in a bare address, such as an IPv6 host, and leaves an extra closing bracket out', () => {
    expect(
      shapes(
        answer(
          'Open http://[::1], (https://[::1]). and http://example.com/a[1]]).',
        ),
      ),
    ).toEqual([
      { text: 'Open ' },
      { local: 'http://[::1]' },
      { text: ', (' },
      { local: 'https://[::1]' },
      { text: '). and ' },
      { web: 'http://example.com/a[1]' },
      { text: ']).' },
    ])
  })

  test('an answer links a complete GitHub path with parentheses and a line hash', () => {
    const href =
      'https://github.com/acme/app/blob/main/app/(marketing)/page.tsx#L4'
    expect(answer(`[Page](${href})`)).toEqual([web(href, text('Page'))])
  })
})
