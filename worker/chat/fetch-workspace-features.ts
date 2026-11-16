import type { createWorkspaceIntegration } from './workspace-integration'

export async function fetchWorkspaceFeatures(
  integration: ReturnType<typeof createWorkspaceIntegration>,
  context: DurableObjectState,
  request: Request,
) {
  const secrets = await integration.secrets.fetch(request)
  if (secrets) return secrets
  const devices = await integration.devices.fetch(request)
  if (devices) return devices
  const response = await integration.chat.fetch(request)
  if (request.method !== 'GET' && request.method !== 'HEAD')
    context.waitUntil(integration.reconcileStopped())
  return response
}
