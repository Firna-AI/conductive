import { waitForRelayHealth } from './health.ts'
import { previewNames } from './names.ts'
import type { OperationContext } from './operations.ts'
import { PreviewRegistry } from './registry.ts'
import { writeRelayConfig } from './relay-config.ts'
import { runWrangler } from './runtime.ts'
import { writeRelaySecretsFile } from './secrets.ts'

export async function deployRelay(ctx: OperationContext): Promise<string> {
  const zone = previewNames(1, ctx.settings.zone).zone
  const namespaceId = await new PreviewRegistry(ctx).ensure()
  const config = await writeRelayConfig(ctx, namespaceId)
  const secret = await writeRelaySecretsFile(
    ctx.settings.secrets.GITHUB_WEBHOOK_SECRET,
    ctx.environment,
  )
  try {
    await runWrangler(ctx, [
      'deploy',
      '--config',
      config,
      '--secrets-file',
      secret.path,
    ])
  } finally {
    await secret.cleanup()
  }
  const origin = `https://${zone}/`
  await waitForRelayHealth(ctx, origin)
  return origin
}
