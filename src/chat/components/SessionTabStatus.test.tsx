import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { WorkspaceChatView } from '../WorkspaceChat'
import { chatFor } from '../state/test-kit'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { ended, turn } from './event-kit'

it('updates session tab spinners from live turns before their session records change', async () => {
  const chat = chatFor()
  await chat.controller.start()
  const markup = () =>
    renderToStaticMarkup(
      <WorkspaceChatView controller={chat.controller} viewport="desktop" />,
    )
  expect(markup()).not.toContain('aria-label="Working"')
  chat.emit({
    ...turn,
    turnId: 'turn-2',
    type: 'turn.started',
    senderId: 'cal',
    choice: chat.controller.getSnapshot().sessions[0].choice,
    startedAt: FAKE_TIME,
    messageIds: [],
  })
  expect(markup()).toContain('aria-label="Working"')
  await chat.controller.select('debounce')
  expect(markup()).toContain('aria-label="Working"')
  chat.emit(ended('finished', 'turn-2'))
  expect(markup()).not.toContain('aria-label="Working"')

  const session = chat.controller
    .getSnapshot()
    .sessions.find((item) => item.id === FAKE_IDS.session)
  if (!session) throw new Error('The session is missing.')
  chat.emit({
    type: 'session.updated',
    session: {
      ...session,
      activeTurnId: 'turn-3',
      activeTurnStartedAt: FAKE_TIME,
    },
  })
  expect(markup()).toContain('aria-label="Working"')
  chat.emit(ended('finished', 'turn-3'))
  expect(markup()).not.toContain('aria-label="Working"')
  chat.controller.stop()
})
