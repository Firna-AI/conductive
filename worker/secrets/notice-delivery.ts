import { resumesAtOpen } from '../../src/app/first-start'
import type { SecretRequest } from '../../src/shared/secret-requests'
import { workspaceRuntime } from '../lifecycle/runtime'
import { workspaceResponse } from '../lifecycle/workspace-response'
import { resumeWorkspace } from '../lifecycle/workspace-resume'
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
  const lifecycle = workspaceRuntime(runtime.env)
  const detail = await workspaceResponse(lifecycle, orgId, request.workspaceId)
  if (resumesAtOpen(detail))
    await resumeWorkspace(lifecycle, orgId, request.workspaceId, senderId)
}
