import { expect, it } from 'vitest'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { sessionTarget } from './pane-selection'
import { choice, file, first, tabChat } from './tab-order-test-kit'
import { newSessionRecord } from './test-kit'

it('keeps the last chosen session behind a one-pane file and picks its next session after a close', async () => {
  const middle = { kind: 'session', sessionId: 'middle' } as const
  const next = { kind: 'session', sessionId: 'next' } as const
  const chat = tabChat([first, middle, next, file], { conversation: 'history' })
  chat.setSessions([
    newSessionRecord(FAKE_IDS.session, choice),
    newSessionRecord('middle', choice),
    newSessionRecord('next', choice),
  ])
  await chat.controller.start()
  await chat.controller.select('middle')
  chat.controller.updateView((view) => ({
    ...view,
    panes: [{ ...view.panes[0], activeTab: file }],
  }))
  expect(sessionTarget(chat.controller.getSnapshot())).toBe('middle')
  chat.emit({
    type: 'session.updated',
    session: newSessionRecord('middle', choice, FAKE_TIME),
  })
  expect(sessionTarget(chat.controller.getSnapshot())).toBe('next')
  expect(chat.controller.getSnapshot().view?.panes[0]).toEqual({
    tabs: [first, next, file],
    activeTab: file,
    temporaryTab: null,
  })
  expect(chat.controller.getSnapshot().lastSessionIds).toEqual(['next', null])
  chat.controller.stop()
})
