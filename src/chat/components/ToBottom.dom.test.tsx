// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toBottomLabel } from '../../ui/components/chat/ToBottomButton'
import { byLabel, byRole, queryByRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { layOutChat, mountLongTurn, older } from './reading-place-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const toBottom = () => queryByRole('button', toBottomLabel)
const scrolled = () =>
  byLabel('Chat').firstElementChild?.dispatchEvent(new Event('scroll'))

describe('the button to the bottom of the chat', () => {
  it('shows while the reader reads higher up, and shows the bottom of the chat on a press', async () => {
    const { resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    expect(toBottom()).toBeNull()

    await act(async () => chat.read(chat.rowOf(older), 100))
    expect(chat.scrollTop()).toBeLessThan(0)

    await press(byRole('button', toBottomLabel))
    expect(chat.scrollTop()).toBe(0)
    // A browser sends a scroll event after a scroll that code sets.
    await act(async () => scrolled())
    expect(toBottom()).toBeNull()
  })

  it('stays hidden for a small scroll near the bottom, and hides when the reader scrolls back down', async () => {
    const { resize } = await mountLongTurn()
    const chat = layOutChat()
    await resize()
    const newest = chat.rowOf('Each field has its tests.')

    await act(async () => chat.read(newest, chat.topOf(newest) + 40))
    expect(chat.scrollTop()).toBe(-40)
    expect(toBottom()).toBeNull()

    await act(async () => chat.read(chat.rowOf(older), 100))
    expect(toBottom()).not.toBeNull()

    await act(async () => chat.readTheEnd())
    expect(toBottom()).toBeNull()
  })
})
