import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

import { routes } from '../../src/app/router.ts'
import type { ChatEvent } from '../../src/shared/chat-events.ts'
import { chatHistoryPath } from '../../src/shared/events.ts'
import { sessionLink } from '../../src/shared/session-link.ts'
import { FakeApiServer } from '../../src/test-support/fake-api.ts'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  FAKE_TIME,
} from '../../src/test-support/fixtures/core.ts'
import { withBrowserEntry } from './browser-entry.js'
import { installWindowApi } from './window-shell.js'

const phone = { width: 390, height: 844, useContentSize: true, frame: false }
const source = { workspaceId: 'A'.repeat(43), sessionId: 'B'.repeat(43) }
const evidence = resolve(
  import.meta.dirname,
  '../../.context/chat-text-word-break-default',
)

function stoppedChat(link: string): FakeApiServer {
  const server = new FakeApiServer({
    conversation: 'running',
    savedLists: false,
  })
  const turn = { sessionId: FAKE_IDS.session, turnId: 'turn-1' }
  const events: readonly ChatEvent[] = [
    {
      ...turn,
      type: 'assistant.completed',
      messageId: 'answer-1',
      text: `1. Check the source session.\n2. ${link}`,
      userMessageIds: [],
    },
    {
      ...turn,
      type: 'assistant.completed',
      messageId: 'answer-2',
      text: 'I stopped after checking the source session.',
      userMessageIds: [],
    },
    { ...turn, type: 'turn.stop-requested', requestedBySession: source },
    {
      ...turn,
      type: 'turn.completed',
      state: 'stopped',
      durationMs: 1_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    },
  ]
  let eventNumber = server.events.history().throughEventNumber
  for (const event of events) {
    eventNumber += 1
    server.events.store({
      workspaceId: FAKE_IDS.workspace,
      eventNumber,
      occurredAt: FAKE_TIME + eventNumber * 1_000,
      event,
    })
  }
  server.handle(
    'GET',
    chatHistoryPath(FAKE_IDS.org, FAKE_IDS.workspace, FAKE_IDS.session),
    async () => Response.json(server.events.history()),
  )
  return server
}

async function expectTextToFit(text: Locator, chat: Locator): Promise<void> {
  await expect(text).toBeVisible()
  const textBox = await text.boundingBox()
  const chatBox = await chat.boundingBox()
  if (!textBox || !chatBox) throw new Error('The chat text has no box')
  expect(textBox.x, 'The text starts inside the chat').toBeGreaterThanOrEqual(
    chatBox.x,
  )
  expect(
    textBox.x + textBox.width,
    'The text ends inside the chat',
  ).toBeLessThanOrEqual(chatBox.x + chatBox.width)
}

async function expectMarkersOnOneLine(chat: Locator): Promise<void> {
  const shortItem = chat.getByText('1. Check the source session.', {
    exact: true,
  })
  await expect(shortItem).toBeVisible()
  const lineBox = await shortItem.boundingBox()
  if (!lineBox) throw new Error('The short list item has no box')
  for (const number of ['1.', '2.']) {
    const marker = chat.getByText(number, { exact: true })
    await expect(marker).toBeVisible()
    const markerBox = await marker.boundingBox()
    if (!markerBox) throw new Error(`The ${number} marker has no box`)
    expect(
      markerBox.height,
      `The ${number} marker stays on one line`,
    ).toBeLessThanOrEqual(lineBox.height)
  }
}

test('a phone keeps a long unknown stop-source link and an open numbered work message inside the chat', async () => {
  await mkdir(evidence, { recursive: true })
  await withBrowserEntry('chat-word-break', phone, async ({ page, origin }) => {
    try {
      const link = sessionLink(
        FAKE_ORIGIN,
        FAKE_IDS.org,
        source.workspaceId,
        source.sessionId,
      )
      await installWindowApi(page, origin, false, stoppedChat(link))
      await page.goto(
        new URL(routes.workspace(FAKE_IDS.org, FAKE_IDS.workspace), origin)
          .href,
      )
      const chat = page.getByRole('region', { name: 'Chat', exact: true })
      const stopped = chat.getByText(`Stopped from ${link}`, { exact: true })
      await expectTextToFit(stopped, chat)
      await chat.getByText('1 tool call, 1 message', { exact: true }).click()
      const messageLink = chat.getByRole('link', { name: link, exact: true })
      await messageLink.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Enter')
      await expectTextToFit(messageLink, chat)
      await expectMarkersOnOneLine(chat)
      await page.screenshot({
        path: resolve(evidence, 'marker-regression.png'),
      })
    } catch (error) {
      await page.screenshot({
        path: resolve(evidence, 'marker-regression-failure.png'),
      })
      throw error
    }
  })
})
