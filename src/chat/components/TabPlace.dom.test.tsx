// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { workspaceSessions } from '../../../docs/mockups/src/fixtures/sessions'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { asMessageField, typeMessage } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { said } from './event-kit'
import {
  ended,
  layOutChat,
  mountLongTurn,
  older,
} from './reading-place-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const [shown, other] = workspaceSessions.map((session) => session.title ?? '')
const late = 'Late output while away.'

/** Shows the other session tab, then the tab of the long turn again. */
async function visitOtherTab(meanwhile: () => void = () => {}) {
  await press(byRole('button', other))
  await waitFor(() => !queryByText(older), 'the other session')
  await act(async () => meanwhile())
  await press(byRole('button', shown))
  await waitFor(() => queryByText(older), 'the long turn again')
}

describe('the place of each session tab', () => {
  it('gives back the row that the reader read after another tab showed, also when output came in the meantime', async () => {
    const { emit, resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf(older), 100)

    await visitOtherTab(() => emit(said('late', late, 'turn-3')))
    await waitFor(() => queryByText(late), 'the output that came')
    await resize()
    expect(chat.topOf(chat.rowOf(older))).toBe(100)
    expect(chat.scrollTop()).toBeLessThan(0)
  })

  it('shows the bottom with the newest output when the reader was at the bottom', async () => {
    const { emit, resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf(older), 100)
    chat.readTheEnd()

    await visitOtherTab(() => emit(said('late', late, 'turn-3')))
    await waitFor(() => queryByText(late), 'the output that came')
    await resize()
    expect(chat.scrollTop()).toBe(0)
  })

  it('shows the bottom when the read row left the chat in the meantime', async () => {
    const { emit, resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf('Step 5.'), 100)

    await visitOtherTab(() => emit(ended('finished', 'turn-3')))
    await waitFor(() => queryByText('16 tool calls, 16 messages'), 'the fold')
    await resize()
    expect(chat.scrollTop()).toBe(0)
  })

  it('gives back the read row when the chat shows again after a page took its place, as a file tab does', async () => {
    const { emit, resize, showPage } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf(older), 100)

    await showPage(<p>A file tab</p>)
    expect(queryByText(older)).toBeNull()
    await act(async () => emit(said('late', late, 'turn-3')))
    await showPage(null)
    await waitFor(() => queryByText(late), 'the output that came')
    await resize()
    expect(chat.topOf(chat.rowOf(older))).toBe(100)
  })

  it('keeps the read row of a session whose sent message still waits, when the tab shows again', async () => {
    const { resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    const box = await waitFor(
      () => queryByRole('textbox', 'Message'),
      'the message box',
    )
    typeMessage(asMessageField(box), 'Ship it.')
    await press(byRole('button', 'Send'))
    await waitFor(() => queryByText('Ship it.'), 'the waiting message')
    await resize()
    chat.read(chat.rowOf(older), 100)

    await visitOtherTab()
    await resize()
    expect(queryByText('Ship it.')).not.toBeNull()
    expect(chat.topOf(chat.rowOf(older))).toBe(100)
  })

  it('shows the bottom when the user sends a message after a switch of session tabs', async () => {
    const { resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf(older), 100)
    await visitOtherTab()
    await resize()
    expect(chat.topOf(chat.rowOf(older))).toBe(100)

    const box = await waitFor(
      () => queryByRole('textbox', 'Message'),
      'the message box',
    )
    typeMessage(asMessageField(box), 'Ship it.')
    await press(byRole('button', 'Send'))
    await waitFor(() => queryByText('Ship it.'), 'the sent message')
    chat.layoutAgain()
    await resize()
    expect(chat.scrollTop()).toBe(0)
  })

  it('opens a session that kept no place at the bottom, not at the place of the tab before it', async () => {
    const { resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    chat.read(chat.rowOf(older), 100)

    await press(byRole('button', other))
    await waitFor(() => !queryByText(older), 'the other session')
    await resize()
    expect(chat.scrollTop()).toBe(0)
  })
})
