import type { AgentChatEvent } from '../../src/shared/chat-events'
import { engineFixture } from '../../runner/test-support/engine'
import type { FakeRunner } from '../test-support/fake-runner'
import type { attachmentFixture } from './attachment.test-support'
type AttachmentFixture = Awaited<ReturnType<typeof attachmentFixture>>
export async function connectAttachmentEngine(
  fixture: AttachmentFixture,
  runner: FakeRunner,
) {
  let forward: (event: AgentChatEvent) => Promise<void> = async () => {}
  const harness = await engineFixture({
    now: fixture.clock.now,
    emit: (event) => forward(event),
  })
  forward = async (event) => {
    await harness.store.append(event, fixture.clock.now())
    harness.events.push(structuredClone(event))
    runner.emit(event)
  }
  const commands: Promise<void>[] = []
  fixture.observeOutgoing((command) => {
    if (command.type === 'turn') {
      if (!command.credential)
        throw new Error('The attachment engine needs a version 2 turn.')
      commands.push(harness.engine.command(command))
    } else if (command.type === 'message') {
      if (command.login)
        throw new Error('The attachment engine needs a version 2 message.')
      commands.push(harness.engine.command(command))
    } else if (command.type === 'interrupt' || command.type === 'model')
      commands.push(harness.engine.command(command))
  })
  const drain = async () => {
    let count: number
    do {
      count = commands.length
      await fixture.drainAttachments()
      await Promise.all(commands)
      await harness.engine.idle()
      await fixture.drain()
    } while (count !== commands.length)
  }
  return { ...harness, drain }
}
