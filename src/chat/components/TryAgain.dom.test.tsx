// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { retryMessagePath } from '../../shared/sessions'
import {
  byText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const reason =
  'Only the newest failed request can run again. Send a new message.'

describe('Try again in a tab that missed newer events', () => {
  it('shows why the Worker refused the old retry, and what to do instead', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ conversation: 'failed' })
    // Another tab sent a newer message, so the Worker refuses this retry.
    const retry = retryMessagePath(org, ws, FAKE_IDS.session, 'ask')
    const refused = { error: { code: 'retry_not_available', message: reason } }
    server.json('POST', retry, refused, 409)
    const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message))
    await mount(
      <WorkspaceChat
        fetch={server.fetch}
        orgId={org}
        subscribe={subscribe}
        viewport="desktop"
        workspaceId={ws}
      />,
    )

    const tryAgain = await waitFor(
      () => queryByRole('button', 'Try again'),
      'the Try again of the failed turn',
    )
    await press(tryAgain)
    await waitFor(() => queryByText(reason), 'the reason of the refusal')
    expect(byText("The turn didn't restart")).not.toBeNull()
    const sent = server.requests.filter(
      (request) =>
        request.method === 'POST' && new URL(request.url).pathname === retry,
    )
    expect(sent).toHaveLength(1)
  })
})
