import { createHash } from 'node:crypto'
import { Cloudflare } from './cloudflare.ts'
import type { CommandReply, OperationContext } from './operations.ts'
import { record, text } from './remote-values.ts'
import { commandEnvironment } from './runtime.ts'

export class PreviewStorage {
  private readonly ctx: OperationContext
  private credentials: Promise<Record<string, string>> | undefined
  constructor(ctx: OperationContext) {
    this.ctx = ctx
  }

  private async credentialsForS3(): Promise<Record<string, string>> {
    const cf = new Cloudflare(this.ctx)
    let id: string | undefined
    for (const path of [cf.account('/tokens/verify'), '/user/tokens/verify']) {
      try {
        const reply = await cf.request(path)
        id = text(
          record(reply?.result, 'Cloudflare token').id,
          'Cloudflare token ID',
        )
        break
      } catch {
        /* The token can belong to an account or a user. */
      }
    }
    if (id === undefined)
      throw new Error('Could not read the Cloudflare token ID.')
    return {
      ...commandEnvironment(this.ctx),
      AWS_ACCESS_KEY_ID: id,
      AWS_SECRET_ACCESS_KEY: createHash('sha256')
        .update(this.ctx.settings.apiToken)
        .digest('hex'),
      AWS_DEFAULT_REGION: 'auto',
      AWS_REQUEST_CHECKSUM_CALCULATION: 'when_required',
      AWS_RESPONSE_CHECKSUM_VALIDATION: 'when_required',
    }
  }

  async run(args: string[]): Promise<CommandReply> {
    this.credentials ??= this.credentialsForS3()
    const env = await this.credentials
    try {
      return await this.ctx.io.command({
        executable: 'aws',
        args: [
          ...args,
          '--endpoint-url',
          `https://${this.ctx.settings.accountId}.r2.cloudflarestorage.com`,
        ],
        cwd: this.ctx.cwd,
        env,
      })
    } catch {
      throw new Error('AWS command could not start.')
    }
  }
}

export async function deleteAttachments(
  ctx: OperationContext,
  orgIds: string[],
): Promise<void> {
  const storage = new PreviewStorage(ctx)
  for (const orgId of orgIds) {
    const reply = await storage.run([
      's3',
      'rm',
      `s3://conductive-preview-attachments/attachments/${orgId}/`,
      '--recursive',
      '--only-show-errors',
    ])
    if (reply.exitCode !== 0)
      throw new Error('Preview attachment deletion failed.')
  }
}
