import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { WorkspaceChatView } from '../../chat/WorkspaceChat'
import { ChatController } from '../../chat/state/controller'
import { isRunning } from '../../chat/state/chat-snapshot'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { resetDevWindow, setupDevWindow } from './attachment-test-kit'
import { createFakeServices } from './fake-services'

beforeEach(setupDevWindow)
afterEach(resetDevWindow)

it('shows working session tabs from the development workspace state and keeps explicit queued chats idle', async () => {
  for (const [search, workspaceId, running] of [
    ['', 'fix-cart-flake', true],
    ['', 'email-dark-mode', true],
    ['?workspace=working', FAKE_IDS.workspace, true],
    ['?conversation=queued', 'fix-cart-flake', false],
  ] as const) {
    const services = createFakeServices(search)
    const controller = new ChatController({
      target: { orgId: FAKE_IDS.org, workspaceId },
      client: services.api,
      subscribe: (target, afterEventNumber, listener) =>
        services.events.open({ ...target, afterEventNumber }, listener),
    })
    await controller.start()
    const snapshot = controller.getSnapshot()
    expect(snapshot.workspace?.state).toBe('working')
    expect(isRunning(snapshot, FAKE_IDS.session)).toBe(running)
    const markup = renderToStaticMarkup(
      <WorkspaceChatView controller={controller} viewport="desktop" />,
    )
    expect(markup.includes('aria-label="Working"')).toBe(running)
    controller.stop()
  }
})
