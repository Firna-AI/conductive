import { renderToStaticMarkup } from 'react-dom/server'
import type { FakeApiOptions, FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { chatFor } from '../state/test-kit'
import type { PaneItem } from './pane-moves'
import { SessionChat } from './SessionChat'
import { TabNodes } from './tab-nodes'
import type { TabRowDrag } from './useTabDrag'

/** The clock of the render tests: 2m 41s after the recorded turn began. */
export const now = FAKE_TIME + 161_000

/**
 * The props of the column that a tab row takes, for a picture of a row of
 * one pane while no drag runs: a drag that binds nothing, and the pane item.
 */
export function stillRow(): { drag: TabRowDrag; paneItem: PaneItem } {
  return {
    drag: {
      nodes: new TabNodes(),
      item: () => ({}),
      line: null,
      status: '',
      lifted: null,
      edge: null,
      dragging: false,
    },
    paneItem: { split: false, move: null },
  }
}

/** The text of rendered markup, with each tag as a space. */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

/**
 * A chat on the fake API, loaded, with its open session rendered on demand.
 * `setup` changes the fake's replies before the load, and `hold` keeps the
 * requests that it picks waiting.
 */
export async function renderChat(
  options: FakeApiOptions & {
    setup?: (server: FakeApiServer) => void
    hold?: (request: Request) => boolean
  },
) {
  const chat = chatFor(options)
  options.setup?.(chat.server)
  await chat.controller.start()
  const markup = () =>
    renderToStaticMarkup(
      <SessionChat
        controller={chat.controller}
        mobile={false}
        now={now}
        onConnectAgent={() => {}}
        snapshot={chat.controller.getSnapshot()}
      />,
    )
  return { chat, markup, text: () => textOf(markup()) }
}
