// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { fakeUsers } from '../../test-support/fixtures/core'
import { asMessageField, typeMessage } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  ended,
  fold,
  layOutChat,
  message,
  mountLongTurn,
  older,
} from './reading-place-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the place of the reader in the chat', () => {
  it('keeps an older message in place when a long turn ends and folds while the reader reads higher up, and keeps the newest message in view at the bottom', async () => {
    const { emit, resize } = await mountLongTurn()
    const chat = layOutChat()
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
    expect([chat.scrollTop(), chat.topOf(chat.rowOf('Thanks.'))]).toEqual([
      0, 180,
    ])
  })

  it('keeps the line of the fold in place when the row that the reader reads folds away', async () => {
    const { emit, resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf('Step 5.'), 100)

    await act(async () => emit(ended('finished', 'turn-3')))
    await waitFor(() => queryByText(fold), 'the fold of the long turn')
    chat.layoutAgain()
    await resize()
    expect(chat.topOf(chat.rowOf(fold))).toBe(100)
  })

  it('shows the bottom when the user sends a message while reading higher up, and keeps the read row for a message of another member', async () => {
    const { emit, resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf(older), 100)

    const teammate = {
      ...message,
      id: 'ask-4',
      text: 'The teammate asks too.',
      sender: fakeUsers[1],
    }
    await act(async () => emit({ type: 'message.accepted', message: teammate }))
    await waitFor(() => queryByText(teammate.text), 'the teammate message')
    chat.layoutAgain()
    await resize()
    expect(chat.topOf(chat.rowOf(older))).toBe(100)
    expect(chat.scrollTop()).toBeLessThan(0)

    const box = await waitFor(
      () => queryByRole('textbox', 'Message'),
      'the message box',
    )
    typeMessage(asMessageField(box), 'Ship it.')
    await press(byRole('button', 'Send'))
    await waitFor(() => queryByText('Ship it.'), 'the sent message')
    chat.layoutAgain()
    await resize()
    // The Working row of the running turn shows under the sent message.
    expect(chat.scrollTop()).toBe(0)
    expect(chat.topOf(chat.rowOf('Ship it.'))).toBe(140)
  })
})
