import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FakeApiOptions, FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import type { ChatController } from '../state/controller'
import { chatFor } from '../state/test-kit'
import { ChatClock, type Clock } from '../ui/clock'
import { SessionChat, type SessionChatProps } from './SessionChat'

/** The clock of the render tests: 2m 41s after the recorded turn began. */
const testClock: Clock = { now: () => FAKE_TIME + 161_000 }

/**
 * Gives the parts of the chat under it the clock of the render tests, as
 * `ChatBody` gives its own clock.
 */
export function TestClock(props: { children: ReactNode }) {
  return (
    <ChatClock.Provider value={testClock}>{props.children}</ChatClock.Provider>
  )
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
 * The markup of the chat of the open session of a controller, on a computer,
 * at the time of the render tests. `props` adds the props of the chat, such
 * as `readOnly`.
 */
export function sessionMarkup(
  controller: ChatController,
  props: Partial<SessionChatProps> = {},
): string {
  return renderToStaticMarkup(
    <TestClock>
      <SessionChat
        controller={controller}
        mobile={false}
        snapshot={controller.getSnapshot()}
        {...props}
      />
    </TestClock>,
  )
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
    sessionMarkup(chat.controller, { onConnectAgent: () => {} })
  return { chat, markup, text: () => textOf(markup()) }
}
