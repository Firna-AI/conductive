// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatHistoryPath } from '../../shared/events'
import { nameLabel } from '../../shared/name-label'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import { ended, said } from './event-kit'
import {
  chatBoxes,
  layOut,
  mountLongTurn,
  older,
} from './reading-place-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const { message, sessions } = workspaceFixtures()
const fold = '16 tool calls, 16 messages'

/** A later message of the agent in the long turn, which the chat shows. */
async function writes(
  emit: (event: ReturnType<typeof said>) => void,
  text: string,
) {
  await act(async () => emit(said(text, text, 'turn-3')))
  await waitFor(() => queryByText(text), `the message "${text}"`)
}

describe('the place of the reader in the chat', () => {
  it('keeps an older message in place when a long turn ends and folds while the reader reads higher up, and keeps the newest message in view at the bottom', async () => {
    const { scroller, transcript, emit, resize } = await mountLongTurn()
    const chat = layOut(scroller, transcript)
    await resize()
    chat.read(chat.rowOf(older), 100)

    await act(async () => emit(ended('finished', 'turn-3')))
    await waitFor(() => queryByText(fold), 'the fold of the long turn')
    chat.layoutAgain()
    await resize()
    expect(chat.topOf(chat.rowOf(older))).toBe(100)

    chat.readTheEnd()
    const next = { ...message, id: 'ask-4', text: 'Thanks.' }
    await act(async () => emit({ type: 'message.accepted', message: next }))
    await waitFor(() => queryByText('Thanks.'), 'the newest message')
    chat.layoutAgain()
    await resize()
    expect([scroller.scrollTop, chat.topOf(chat.rowOf('Thanks.'))]).toEqual([
      0, 180,
    ])
  })

  it('keeps the line of the fold in place when the row that the reader reads folds away', async () => {
    const { scroller, transcript, emit, resize } = await mountLongTurn()
    const chat = layOut(scroller, transcript)
    await resize()
    chat.read(chat.rowOf('Step 5.'), 100)

    await act(async () => emit(ended('finished', 'turn-3')))
    await waitFor(() => queryByText(fold), 'the fold of the long turn')
    chat.layoutAgain()
    await resize()
    expect(chat.topOf(chat.rowOf(fold))).toBe(100)
  })

  it('keeps a scroll of the reader that comes before the browser reports a change of size', async () => {
    const { scroller, transcript, emit, resize } = await mountLongTurn()
    const chat = layOut(scroller, transcript)
    await resize()
    chat.read(chat.rowOf(older), 100)

    // The reader turns the wheel 80 px up from the place that they saw,
    // in the same frame as a new message of the agent.
    await writes(emit, 'Step 17.')
    chat.scrollBy(-80)
    await resize()
    expect(chat.topOf(chat.rowOf(older))).toBe(180)
  })

  it('follows the newest message after the reader scrolls to the end before the browser reports a change of size', async () => {
    const { scroller, transcript, emit, resize } = await mountLongTurn()
    const chat = layOut(scroller, transcript)
    await resize()
    chat.read(chat.rowOf(older), 100)

    await writes(emit, 'Step 17.')
    chat.readTheEnd()
    await resize()
    await writes(emit, 'Step 18.')
    await resize()
    // The running turn shows its working line under the newest message.
    expect([scroller.scrollTop, chat.topOf(chat.rowOf('Step 18.'))]).toEqual([
      0, 140,
    ])
  })

  it('opens another session at the end of its chat after the reader scrolled up in this one', async () => {
    const { server, resize } = await mountLongTurn()
    const other = sessions.sessions[1]
    server.json(
      'GET',
      chatHistoryPath(FAKE_IDS.org, FAKE_IDS.workspace, other.id),
      {
        events: recordedChatEvents('history', FAKE_IDS.workspace, other.id),
        throughEventNumber: server.events.history().throughEventNumber,
      },
    )
    const answer =
      'The checkout form now suggests addresses. Manual entry still works.'
    const opened = () => !queryByText(older) && queryByText(answer)
    // Both sessions load their history before the reader scrolls.
    await press(byRole('button', nameLabel(other.title)))
    await waitFor(opened, 'the chat of the other session')
    await press(byRole('button', nameLabel(sessions.sessions[0].title)))
    await waitFor(() => queryByText(older), 'the chat of the long turn')
    const { scroller, transcript } = chatBoxes()
    const chat = layOut(scroller, transcript)
    await resize()
    chat.read(chat.rowOf(older), 100)

    await press(byRole('button', nameLabel(other.title)))
    await waitFor(opened, 'the chat of the other session again')
    expect(chatBoxes().scroller.scrollTop).toBe(0)
  })
})
