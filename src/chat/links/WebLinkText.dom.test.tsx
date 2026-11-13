// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import {
  LinkOpeningProvider,
  type LinkOpening,
} from '../../shell/ui/text-links'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { mount } from '../../test-support/mount'
import { AgentText } from '../components/AgentText'
import { MessageLine } from '../components/MessageLine'
import { appLinks } from './links-test-kit'

const pull = 'https://github.com/acme/app/pull/2'
const docs = 'https://docs.places.example/v1'
const keys = 'https://places.example/account/keys'
const local = 'http://localhost:3000/checkout'
const agents = routes.accountTab('agents')
const settings = `${FAKE_ORIGIN}${agents}`

const answer = [
  `The pull request: **${pull}**.`,
  `Read the [autocomplete \`v1\` docs](${docs}), and its status at [www.places.example](https://status.bücher.example).`,
  `Try ${local} on [the dev server](http://localhost:3000). Connect Codex at ${settings}.`,
  `The key comes from \` ${keys} \`.`,
].join('\n\n')

/**
 * Mounts `content` in a screen that opens links, and records each page and
 * each port that it opens. Without `ports`, the workspace runs no server.
 */
async function mountOpening(content: ReactNode, ports = true) {
  const opened: (string | number)[] = []
  const opening: LinkOpening = {
    ...appLinks,
    open: (to) => opened.push(to),
    ports: ports
      ? {
          href: (port) => `/preview/port/${port}`,
          open: (port) => opened.push(port),
        }
      : null,
  }
  const { container } = await mount(
    <LinkOpeningProvider value={opening}>{content}</LinkOpeningProvider>,
  )
  return { container, opened }
}

/** Each link of `root`, as a reader and the browser see it. */
const linksIn = (root: Element) =>
  Array.from(root.querySelectorAll('a'), (link) => ({
    text: link.textContent,
    in: link.parentElement?.tagName,
    href: link.getAttribute('href'),
    title: link.getAttribute('title'),
    tab: [link.getAttribute('target'), link.getAttribute('rel')].join(' '),
  }))

/** The link of `root` whose words are `text`. */
function linkNamed(root: Element, text: string): HTMLAnchorElement {
  const found = [...root.querySelectorAll('a')].find(
    (link) => link.textContent === text,
  )
  if (!found) throw new Error(`No link shows ${text}`)
  return found
}

/**
 * Clicks a link as a pointer does, and says whether the app took the click:
 * a click that the app leaves alone is the browser's, which opens the
 * address of the link as its target says. The test then stops the browser,
 * so happy-dom loads no page.
 */
function appTakes(link: HTMLAnchorElement, init: MouseEventInit = {}) {
  let taken = false
  const browser = (event: Event) => {
    taken = event.defaultPrevented
    event.preventDefault()
  }
  document.addEventListener('click', browser)
  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => {
    link.dispatchEvent(click)
  })
  document.removeEventListener('click', browser)
  return taken
}

const newTab = 'noopener noreferrer'

describe('links in the text of an answer', () => {
  test('each link shows its words with its whole address as its title, keeps its bold and code, and leads to a new tab, a page of the app, or the preview of its port', async () => {
    const { container } = await mountOpening(<AgentText text={answer} />)
    expect({
      links: linksIn(container),
      code: container.querySelector('a code')?.textContent,
    }).toEqual({
      links: [
        {
          text: pull,
          in: 'STRONG',
          href: pull,
          title: pull,
          tab: `_blank ${newTab}`,
        },
        {
          text: 'autocomplete v1 docs',
          in: 'P',
          href: docs,
          title: docs,
          tab: `_blank ${newTab}`,
        },
        {
          text: 'https://status.bücher.example',
          in: 'P',
          href: 'https://status.xn--bcher-kva.example/',
          title: 'https://status.xn--bcher-kva.example/',
          tab: `_blank ${newTab}`,
        },
        {
          text: local,
          in: 'P',
          href: '/preview/port/3000',
          title: local,
          tab: ' ',
        },
        {
          text: 'the dev server',
          in: 'P',
          href: '/preview/port/3000',
          title: 'http://localhost:3000/',
          tab: ' ',
        },
        { text: settings, in: 'P', href: agents, title: settings, tab: ' ' },
        {
          text: keys,
          in: 'CODE',
          href: keys,
          title: keys,
          tab: `_blank ${newTab}`,
        },
      ],
      code: 'v1',
    })
  })

  test('a plain press opens a page of the app and the preview of a port in the app, and leaves a press on another link and a press with a modifier key to the browser', async () => {
    const { container, opened } = await mountOpening(
      <AgentText text={answer} />,
    )
    expect({
      taken: [
        appTakes(linkNamed(container, settings)),
        appTakes(linkNamed(container, local)),
        appTakes(linkNamed(container, pull)),
        appTakes(linkNamed(container, settings), { ctrlKey: true }),
        appTakes(linkNamed(container, local), { metaKey: true }),
      ],
      opened,
    }).toEqual({
      taken: [true, true, false, false, false],
      opened: [agents, 3000],
    })
  })

  test('where the workspace runs no server, a local address stays text and a Markdown link to it shows as typed', async () => {
    const { container } = await mountOpening(<AgentText text={answer} />, false)
    expect({
      links: linksIn(container).map((link) => link.text),
      text: container.querySelectorAll('p')[2]?.textContent,
    }).toEqual({
      links: [
        pull,
        'autocomplete v1 docs',
        'https://status.bücher.example',
        settings,
        keys,
      ],
      text: `Try ${local} on [the dev server](http://localhost:3000). Connect Codex at ${settings}.`,
    })
  })

  test('outside a screen that opens links, each link opens a new tab at its address', async () => {
    const { container } = await mount(<AgentText text={answer} />)
    expect(
      linksIn(container)
        .slice(3, 6)
        .map((link) => [link.href, link.tab]),
    ).toEqual([
      [local, `_blank ${newTab}`],
      ['http://localhost:3000/', `_blank ${newTab}`],
      [settings, `_blank ${newTab}`],
    ])
  })

  // A browser leaves the line as it is after a press on a link in it: the
  // link is the target of the press. happy-dom toggles the line on each
  // click in it, so this test checks only that the link gets the press.
  test('a message line shows the links of the answer, and a press on a link in the line goes to the link', async () => {
    const { container, opened } = await mountOpening(
      <MessageLine
        text={`[The agents](${settings}) need a login. See ${pull}.`}
      />,
    )
    const line = container.querySelector('summary')
    expect({
      links: line ? linksIn(line).map((link) => [link.text, link.tab]) : [],
      taken: [
        appTakes(linkNamed(container, 'The agents')),
        appTakes(linkNamed(container, pull)),
      ],
      opened,
    }).toEqual({
      links: [
        ['The agents', ' '],
        [pull, `_blank ${newTab}`],
      ],
      taken: [true, false],
      opened: [agents],
    })
  })
})
