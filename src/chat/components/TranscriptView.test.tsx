import { describe, expect, it } from 'vitest'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { renderChat } from './render-kit'

const turn = { sessionId: FAKE_IDS.session, turnId: 'turn-1' }

describe('the line of a stopped turn', () => {
  it('says You to the member who pressed Stop, and names that member to the others', async () => {
    const admin = await renderChat({ conversation: 'interrupted' })
    expect(admin.text()).toContain('You stopped the agent')
    const member = await renderChat({
      conversation: 'interrupted',
      role: 'member',
    })
    expect(member.text()).toContain('Cal stopped the agent')
    expect(member.text()).not.toContain('You stopped the agent')
  })

  it('keeps a Stop request until the turn ends as stopped, and names nobody without a request', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    chat.emit({ ...turn, type: 'turn.stop-requested', requestedById: 'jonas' })
    expect(text()).toContain('Working')
    expect(text()).not.toContain('stopped')
    chat.emit({
      ...turn,
      type: 'turn.stop-requested',
      requestedById: 'priya',
    })
    chat.emit({ ...turn, type: 'turn.thinking' })
    chat.emit({
      ...turn,
      type: 'turn.completed',
      state: 'stopped',
      durationMs: 5_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['ask'],
    })
    expect(text()).toContain('Jonas Weber stopped the agent')
    expect(text()).not.toContain('Working')
    const next = { ...turn, turnId: 'turn-2' }
    chat.emit({ ...next, type: 'turn.thinking' })
    chat.emit({
      ...next,
      type: 'turn.completed',
      state: 'stopped',
      durationMs: 1_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    })
    expect(text()).toContain('The agent stopped')
  })
})
