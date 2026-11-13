import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import type { Workspace } from '../../shared/workspaces'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { chatParts, type ChatPart } from './chat-parts'
import type { LinkWord } from './link-parts'
import { webLinkOf } from './links-test-kit'

const linked = workspaceFixtures().workspaces.workspaces[0] as Workspace
const links = { orgId: FAKE_IDS.org, workspaces: [linked] }

/** The parts of an answer, and of a sent message. */
const answer = (text: string) =>
  chatParts(text, links, { strong: true, web: webLinkOf })
const sent = (text: string) =>
  chatParts(text, links, { strong: false, web: webLinkOf })

const text = (value: string, strong = false): ChatPart => ({
  kind: 'text',
  text: value,
  strong,
})

/** A link to another site, with its words. */
function web(href: string, words: LinkWord[], strong = false): ChatPart {
  return {
    kind: 'link',
    link: { kind: 'web', url: new URL(href) },
    words,
    strong,
  }
}

/** The words of an address or a label, without bold. */
const plain = (value: string): LinkWord[] => [
  { kind: 'text', text: value, strong: false },
]

describe('the links of chat text', () => {
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
      web(pull, plain(pull), true),
      text(', the '),
      web(docs, [
        { kind: 'text', text: 'places', strong: true },
        { kind: 'text', text: ' ', strong: false },
        { kind: 'code', text: 'v1' },
        { kind: 'text', text: ' docs', strong: false },
      ]),
      text(' and '),
      web(guide, plain(guide)),
      text('.'),
    ])
  })

  test('a sent message shows a Markdown link as typed: its label stays text and code, and its address is a link', () => {
    const pull = 'https://github.com/acme/storefront/pull/468'
    const guide = 'https://design.acme.example/forms/address'
    expect(
      sent(
        `Match ${pull}, and follow [\`https://old.acme.example/forms\`](<${guide}>).`,
      ),
    ).toEqual([
      text('Match '),
      web(pull, plain(pull)),
      text(', and follow ['),
      { kind: 'code', text: 'https://old.acme.example/forms' },
      text('](<'),
      web(guide, plain(guide)),
      text('>).'),
    ])
  })

  test('an answer shows a Markdown link whose address is no link as typed, and the Markdown of an image as typed with its address as a link', () => {
    const typed = `Sign in at [the **portal**](https://user:secret@portal.example/) or https://user@portal.example/login, not [the API](${FAKE_ORIGIN}/api/workspaces).`
    const picture = 'https://cdn.acme.example/form.png'
    expect({
      typed: answer(typed),
      image: answer(`![The **form**](${picture})`),
    }).toEqual({
      typed: [
        text('Sign in at [the '),
        text('portal', true),
        text(
          `](https://user:secret@portal.example/) or https://user@portal.example/login, not [the API](${FAKE_ORIGIN}/api/workspaces).`,
        ),
      ],
      image: [
        text('![The '),
        text('form', true),
        text(']('),
        web(picture, plain(picture)),
        text(')'),
      ],
    })
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
        text: keys,
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
})
