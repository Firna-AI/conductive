import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import type { WorkspaceTools } from './provider'

export async function requirePreviewRelay(
  provider: WorkspaceTools,
): Promise<void> {
  const result = await provider.command(
    'systemctl is-active --quiet conductive-preview-relay.service',
  )
  if (result.timedOut) throw new ProviderError('unavailable', 502)
  if (result.exitCode !== 0)
    throw new HttpError(
      409,
      'preview_relay_unavailable',
      'Previews need newer cloud computer software. Start a new workspace after an admin runs Build computer.',
    )
}
