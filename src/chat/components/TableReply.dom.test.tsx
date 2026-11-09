// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import type { ChatEvent } from '../../shared/chat-events'
import { chatHistoryPath } from '../../shared/events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import { said, turn } from './event-kit'
import { renderChat } from './render-kit'

const first = 'Here are the sizes.'

/** A part of the reply that the agent still writes. */
const part = (text: string): ChatEvent => ({
  ...turn,
  type: 'assistant.delta',
  messageId: 'sizes',
  text,
})

/**
 * The blocks of the reply in the rendered chat, from its first paragraph: a
 * paragraph as its text, and a table as the text of its cells, row by row.
 */
function reply(markup: string): (string | string[][])[] {
  const page = document.createElement('div')
  page.innerHTML = markup
  const blocks = Array.from(page.querySelectorAll('p, table'), (block) =>
    block.tagName === 'TABLE'
      ? Array.from(block.querySelectorAll('tr'), (row) =>
          Array.from(row.children, (cell) => cell.textContent ?? ''),
        )
      : (block.textContent ?? ''),
  )
  const start = blocks.indexOf(first)
  if (start < 0) throw new Error(`The chat shows no "${first}"`)
  return blocks.slice(start)
}

it('shows a header row as text until its separator row arrives, then the table with the rows and the cells that have arrived', async () => {
  const { chat, markup } = await renderChat({ conversation: 'running' })
  const shown = [
    `${first}\n\n| Bundle | Main |\n`,
    '| --- | ---: |\n',
    '| checkout | 182 KB |\n| api/pl',
  ].map((text) => {
    chat.emit(part(text))
    return reply(markup())
  })
  expect(shown).toEqual([
    [first, '| Bundle | Main |'],
    [first, [['Bundle', 'Main']]],
    [first, [['Bundle', 'Main'], ['checkout', '182 KB'], ['api/pl']]],
  ])
})

it('shows a reply with a table from the saved history as after its last live update', async () => {
  const text = `${first}\n\n| Bundle | Main |\n| --- | ---: |\n| checkout | 182 KB |\n| api/places | Server only |\n\nThe proxy runs on the server.`
  const events = [
    part(text.slice(0, 40)),
    part(text.slice(40)),
    said('sizes', text),
  ]
  const live = await renderChat({ conversation: 'running' })
  for (const event of events) live.chat.emit(event)
  const recorded = recordedChatEvents('running')
  const saved = await renderChat({
    conversation: 'running',
    setup: (server) =>
      server.json(
        'GET',
        chatHistoryPath(FAKE_IDS.org, FAKE_IDS.workspace, FAKE_IDS.session),
        {
          events: [
            ...recorded,
            ...events.map((event, index) => ({
              workspaceId: FAKE_IDS.workspace,
              eventNumber: recorded.length + index + 1,
              occurredAt: FAKE_TIME,
              event,
            })),
          ],
          throughEventNumber: recorded.length + events.length,
        },
      ),
  })
  const table = [
    first,
    [
      ['Bundle', 'Main'],
      ['checkout', '182 KB'],
      ['api/places', 'Server only'],
    ],
    'The proxy runs on the server.',
  ]
  expect({ live: reply(live.markup()), saved: reply(saved.markup()) }).toEqual({
    live: table,
    saved: table,
  })
})
