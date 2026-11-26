import type { SecretRequest } from '../../src/shared/secret-requests'
import { startAcceptedMessage } from '../lifecycle/accepted-message-start'
import { workspaceRuntime } from '../lifecycle/runtime'
import type { SecretRuntime } from './runtime'

export async function deliverSecretNotice(
  runtime: SecretRuntime,
  orgId: string,
  request: SecretRequest,
) {
  const notice = request.notice
  if (notice?.state !== 'sent') return
  const senderId = await runtime.chat.runLifecycle(async () => {
    if (runtime.chat.runner.connections.current) {
      await runtime.chat.flushRunner()
      return null
    }
    const turn = await runtime.chat.store.read(request.workspaceId, (view) =>
      view.turn(notice.turnId),
    )
    return turn?.senderId ?? null
  })
  if (!senderId) return
  await startAcceptedMessage(
    workspaceRuntime(runtime.env),
    orgId,
    request.workspaceId,
    senderId,
  )
}
