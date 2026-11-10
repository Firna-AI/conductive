import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, WORKSPACE_ID } from './harness.test-support'
import { sessionRecord } from './retry.test-support'
import type { TitleModelCall } from './title-model'
import { createTitleFixture } from './workspace-title.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['failed', 'empty'] as const)(
  'keeps names empty after a %s answer and asks again on the next accepted text',
  async (failure) => {
    const run = vi.fn<TitleModelCall>()
    if (failure === 'failed')
      run.mockRejectedValueOnce(new Error('private answer'))
    else run.mockResolvedValueOnce({ response: 'Title: ""' })
    run.mockResolvedValue({ response: 'Fix chat titles' })
    const { fixture, first, acceptFirst, drain } = await createTitleFixture(
      harness,
      run,
    )
    await fixture.actor.api.controls.captureWarnings(true)
    await acceptFirst()
    await drain()
    expect((await sessionRecord(fixture, first.sessionId)).title).toBeNull()
    expect(
      await fixture.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
        .bind(WORKSPACE_ID)
        .first('name'),
    ).toBe('')
    expect(await fixture.actor.api.controls.warningCount()).toBe(1)
    await fixture.restart()
    await fixture.send(
      first.sessionId,
      'retry-title',
      fixture.ownerCookie,
      CLAUDE,
      'Fix the chat title',
    )
    await drain()
    expect((await sessionRecord(fixture, first.sessionId)).title).toBe(
      'Fix chat titles',
    )
    expect(run).toHaveBeenCalledTimes(2)
    expect(
      run.mock.calls.map(([, input]) => input.messages?.[1].content),
    ).toEqual([
      'Task message as a JSON string:\n"Fix the workspace title"',
      'Task message as a JSON string:\n"Fix the workspace title"',
    ])
    await fixture.send(first.sessionId, 'after-title')
    await drain()
    expect(run).toHaveBeenCalledTimes(2)
  },
)

it('asks nothing for an attachment-only first message and titles from the next accepted text', async () => {
  const run = vi
    .fn<TitleModelCall>()
    .mockResolvedValue({ response: 'Inspect login screenshot' })
  const { fixture, first, acceptFirst, drain } = await createTitleFixture(
    harness,
    run,
    {
      resolveAttachments: async () => ({
        attachments: [
          {
            id: 'screenshot',
            name: 'login.png',
            kind: 'image',
            mediaType: 'image/png',
            sizeBytes: 100,
          },
        ],
        paths: [],
      }),
    },
  )
  await fixture.actor.api.controls.captureWarnings(true)
  first.request.text = ''
  first.request.attachmentIds = ['screenshot']
  await acceptFirst()
  await drain()
  expect(run).not.toHaveBeenCalled()
  expect(await fixture.actor.api.controls.warningCount()).toBe(0)
  expect((await sessionRecord(fixture, first.sessionId)).title).toBeNull()
  await fixture.send(
    first.sessionId,
    'first-text',
    fixture.ownerCookie,
    CLAUDE,
    'Inspect the login screenshot',
  )
  await drain()
  expect((await sessionRecord(fixture, first.sessionId)).title).toBe(
    'Inspect login screenshot',
  )
  expect(run).toHaveBeenCalledTimes(1)
  expect(run.mock.calls[0][1].messages?.[1].content).toBe(
    'Task message as a JSON string:\n"Inspect the login screenshot"',
  )
})

it('accepts messages during one pending title call and preserves a runner title that arrives first', async () => {
  let complete: (value: unknown) => void = () => {
    throw new Error('The model call has not started.')
  }
  const answer = new Promise<unknown>((resolve) => {
    complete = resolve
  })
  const run = vi.fn<TitleModelCall>(() => answer)
  const { fixture, first, acceptFirst, drain } = await createTitleFixture(
    harness,
    run,
  )
  await acceptFirst()
  await fixture.drain()
  expect(run).toHaveBeenCalledTimes(1)
  const accepted = await fixture.send(first.sessionId, 'during-title')
  expect(accepted.message.id).toBe('during-title')
  expect(run).toHaveBeenCalledTimes(1)
  const runner = await fixture.connect()
  runner.emit({ type: 'workspace.title', name: 'The runner title' })
  await fixture.drain()
  complete({ response: 'The Worker title' })
  await drain()
  expect(
    (
      await fixture.chat.readWorkspace(WORKSPACE_ID, (view) =>
        view.lifecycleRecovery(),
      )
    ).title?.name,
  ).toBe('The runner title')
  await fixture.send(first.sessionId, 'after-runner-title')
  await drain()
  expect(run).toHaveBeenCalledTimes(1)
})
