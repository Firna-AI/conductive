import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { createTitleFixture } from './workspace-title.test-support'
import type { TitleModelCall } from './title-model'
import { agentToolTaskText } from '../tools/message-text'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('asks for the workspace title with only the original stored task text', async () => {
  await harness.reset()
  const run = vi
    .fn<TitleModelCall>()
    .mockResolvedValue({ response: 'Fix the title' })
  const { fixture, first, acceptFirst, drain } = await createTitleFixture(
    harness,
    run,
  )
  first.request.text = `Fix the title.\nKeep the task text.\n\n---\nSent by: ${fixture.env.APP_ORIGIN}/orgs/org/workspaces/workspace/sessions/session`
  await acceptFirst()
  await drain()
  expect(run).toHaveBeenCalledTimes(1)
  expect(run.mock.calls[0][1].messages?.[1].content).toBe(
    'Task message as a JSON string:\n"Fix the title.\\nKeep the task text."',
  )
})

it('preserves user task lines and whitespace after a lookalike sending-session footer', () => {
  const origin = 'https://app.conductive.test'
  const task = `Task\n\n---\nSent by: ${origin}/orgs/org/workspaces/workspace/sessions/session`
  for (const text of [
    `${task}\nKeep this task text`,
    `${task} `,
    `${task}\n`,
  ]) {
    expect(agentToolTaskText(text, origin)).toBe(text)
  }
})
