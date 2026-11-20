import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceTab } from '../../shared/workspace-view'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  askedText,
  isSend,
  LINKED,
  linkedRecord,
  memberChat,
  pendingIn,
} from './linked-kit'

const first = FAKE_IDS.session

describe('a linked reply while another tab is selected', () => {
  it('keeps the Preview tab and the chat session when a fixed prompt opens a linked session', async () => {
    const chat = memberChat()
    await chat.controller.start()
    const preview: WorkspaceTab = { kind: 'preview', port: 3000 }
    chat.controller.updateView((view) => ({
      ...view,
      tabs: [...view.tabs, preview],
      activeTab: preview,
    }))
    const prompt = 'Fix the failed checks.'

    const outcome = await chat.controller.sendPrompt(prompt)

    const snapshot = chat.controller.getSnapshot()
    expect({
      outcome,
      activeTab: snapshot.view?.activeTab,
      session: snapshot.activeSessionId,
      linked: pendingIn(chat, LINKED),
    }).toEqual({
      outcome: 'sent',
      activeTab: preview,
      session: first,
      linked: [prompt],
    })
  })

  it('keeps a file tab when a delayed reply cannot move into a linked session with a draft', async () => {
    const chat = memberChat({ hold: isSend })
    await chat.controller.start()
    chat.controller.setDraft(first, askedText)
    const sending = chat.controller.send(first)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), {
      timeout: 10_000,
    })
    chat.emit({ type: 'session.updated', session: linkedRecord() })
    await chat.controller.select(LINKED)
    chat.controller.setDraft(LINKED, 'Notes for the new session.')
    await chat.controller.select(first)
    const file: WorkspaceTab = {
      kind: 'file',
      path: 'src/checkout.ts',
      mode: 'source',
    }
    chat.controller.updateView((view) => ({
      ...view,
      tabs: [...view.tabs, file],
      activeTab: file,
    }))

    chat.held.splice(0, 1)[0]()
    await sending

    const snapshot = chat.controller.getSnapshot()
    expect({
      activeTab: snapshot.view?.activeTab,
      session: snapshot.activeSessionId,
      sourceDraft: chat.draftOf(first)?.text,
      linkedDraft: chat.draftOf(LINKED)?.text,
      linked: pendingIn(chat, LINKED),
    }).toEqual({
      activeTab: file,
      session: first,
      sourceDraft: '',
      linkedDraft: 'Notes for the new session.',
      linked: [askedText],
    })
  })
})
